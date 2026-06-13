#!/usr/bin/env python3
"""
Jalankan server (Bun, :3000) + web (Next, :3001) sekaligus dalam satu terminal.

- Tiap proses dijalankan di session/process-group sendiri, jadi Ctrl+C di sini
  mematikan KEDUANYA beserta anak prosesnya (bun --watch / next workers) bersih,
  tanpa meninggalkan proses yatim yang mengganggu terminal lain.
- Output digabung dengan label [server]/[web] dan juga ditulis ke ./logs/*.log.

Pemakaian:
    python3 dev.py            # mode dev (hot reload) — default
    python3 dev.py --prod     # mode produksi (perlu sudah di-build dulu)
    python3 dev.py --free     # bebaskan port 3000/3001 dulu bila dipakai proses lain
"""

from __future__ import annotations

import argparse
import os
import signal
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SERVER_DIR = ROOT / "panel-isp-server"
WEB_DIR = ROOT / "panel-isp-web"
LOG_DIR = ROOT / "logs"

SERVER_PORT = 3000
WEB_PORT = 3001

# Warna ANSI untuk label (lewati kalau bukan TTY).
_TTY = sys.stdout.isatty()
C_SERVER = "\033[36m" if _TTY else ""   # cyan
C_WEB = "\033[35m" if _TTY else ""       # magenta
C_INFO = "\033[33m" if _TTY else ""      # kuning
C_ERR = "\033[31m" if _TTY else ""       # merah
C_RESET = "\033[0m" if _TTY else ""

_print_lock = threading.Lock()
_stopping = threading.Event()


def info(msg: str) -> None:
    with _print_lock:
        print(f"{C_INFO}[dev]{C_RESET} {msg}", flush=True)


def err(msg: str) -> None:
    with _print_lock:
        print(f"{C_ERR}[dev]{C_RESET} {msg}", flush=True)


def port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", port)) == 0


def pids_on_port(port: int) -> list[str]:
    try:
        out = subprocess.run(
            ["lsof", "-ti", f"tcp:{port}", "-sTCP:LISTEN"],
            capture_output=True, text=True, check=False,
        ).stdout.strip()
        return [p for p in out.splitlines() if p]
    except FileNotFoundError:
        return []


def free_port(port: int) -> None:
    pids = pids_on_port(port)
    if not pids:
        return
    info(f"Membebaskan port {port} (PID: {', '.join(pids)})")
    for pid in pids:
        try:
            os.kill(int(pid), signal.SIGTERM)
        except (ProcessLookupError, ValueError):
            pass
    time.sleep(1.0)
    for pid in pids_on_port(port):
        try:
            os.kill(int(pid), signal.SIGKILL)
        except (ProcessLookupError, ValueError):
            pass


def web_command(prod: bool) -> list[str]:
    next_bin = WEB_DIR / "node_modules" / ".bin" / "next"
    if next_bin.exists():
        return [str(next_bin), "start" if prod else "dev", "-p", str(WEB_PORT)]
    # Fallback ke npm bila binari lokal tak ada.
    return ["npm", "run", "start" if prod else "dev", "--", "-p", str(WEB_PORT)]


def server_command(prod: bool) -> list[str]:
    return ["bun", "run", "start"] if prod else ["bun", "run", "dev"]


def stream_output(name: str, color: str, proc: subprocess.Popen, log_path: Path) -> None:
    """Baca output proses baris-per-baris: tampilkan berlabel + tulis ke file log."""
    label = f"{color}[{name}]{C_RESET}"
    with open(log_path, "w", buffering=1) as log:
        assert proc.stdout is not None
        for line in proc.stdout:
            line = line.rstrip("\n")
            with _print_lock:
                print(f"{label} {line}", flush=True)
            log.write(line + "\n")
    # Saat stdout tertutup (proses berakhir), picu shutdown bila bukan kita yang minta.
    proc.wait()
    if not _stopping.is_set():
        err(f"Proses '{name}' berhenti (exit {proc.returncode}). Mematikan yang lain...")
        _stopping.set()


def start_process(cmd: list[str], cwd: Path) -> subprocess.Popen:
    return subprocess.Popen(
        cmd,
        cwd=str(cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env=os.environ.copy(),
        start_new_session=True,  # process group sendiri → bisa dimatikan utuh
    )


def terminate(proc: subprocess.Popen, name: str) -> None:
    if proc.poll() is not None:
        return
    try:
        pgid = os.getpgid(proc.pid)
    except ProcessLookupError:
        return
    info(f"Menghentikan {name}...")
    try:
        os.killpg(pgid, signal.SIGTERM)
    except ProcessLookupError:
        return
    # Beri waktu shutdown anggun, lalu paksa.
    for _ in range(50):  # ~5 detik
        if proc.poll() is not None:
            return
        time.sleep(0.1)
    try:
        os.killpg(pgid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def main() -> int:
    parser = argparse.ArgumentParser(description="Runner server + web Panel ISP")
    parser.add_argument("--prod", action="store_true", help="mode produksi (perlu build dulu)")
    parser.add_argument("--free", action="store_true", help="bebaskan port 3000/3001 bila dipakai")
    args = parser.parse_args()

    if not SERVER_DIR.exists() or not WEB_DIR.exists():
        err("Folder panel-isp-server / panel-isp-web tidak ditemukan. Jalankan dari root repo.")
        return 1

    LOG_DIR.mkdir(exist_ok=True)

    # Cek port.
    for port in (SERVER_PORT, WEB_PORT):
        if port_in_use(port):
            if args.free:
                free_port(port)
            else:
                pids = pids_on_port(port)
                hint = f" (dipakai PID {', '.join(pids)})" if pids else ""
                err(f"Port {port} sudah dipakai{hint}. Jalankan ulang dengan --free untuk membebaskannya.")
                return 1

    procs: list[tuple[str, subprocess.Popen]] = []

    def shutdown_all() -> None:
        _stopping.set()
        # Matikan web dulu lalu server.
        for name, proc in reversed(procs):
            terminate(proc, name)

    # Tangani Ctrl+C / SIGTERM.
    def handle_signal(signum, _frame):
        info(f"Sinyal diterima ({signal.Signals(signum).name}). Menutup...")
        _stopping.set()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    info(f"Server : http://localhost:{SERVER_PORT}")
    info(f"Web    : http://localhost:{WEB_PORT}")
    info(f"Mode   : {'produksi' if args.prod else 'dev (hot reload)'}")
    info(f"Log    : {LOG_DIR}/server.log, {LOG_DIR}/web.log")
    info("Tekan Ctrl+C untuk menghentikan keduanya.\n")

    try:
        server_proc = start_process(server_command(args.prod), SERVER_DIR)
        procs.append(("server", server_proc))
        web_proc = start_process(web_command(args.prod), WEB_DIR)
        procs.append(("web", web_proc))
    except FileNotFoundError as e:
        err(f"Gagal menjalankan proses: {e}. Pastikan 'bun' dan dependensi web sudah terpasang.")
        shutdown_all()
        return 1

    threads = [
        threading.Thread(
            target=stream_output, args=("server", C_SERVER, server_proc, LOG_DIR / "server.log"), daemon=True
        ),
        threading.Thread(
            target=stream_output, args=("web", C_WEB, web_proc, LOG_DIR / "web.log"), daemon=True
        ),
    ]
    for t in threads:
        t.start()

    # Tunggu sampai diminta berhenti atau salah satu proses mati.
    try:
        while not _stopping.is_set():
            time.sleep(0.2)
    except KeyboardInterrupt:
        _stopping.set()

    shutdown_all()
    info("Selesai. Semua proses dihentikan.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

# Panduan: Menambah & Mengelola Pelanggan

Panduan operasional untuk teknisi/admin. Fokus: **memasang pelanggan baru** dari nol
sampai internet jalan, lalu operasi harian (bayar, ganti paket, suspend, dll).

> Konsep dasar: **MikroTik adalah satu-satunya yang dikontrol.** Untuk tiap pelanggan,
> panel otomatis membuat 3 hal di MikroTik: **DHCP lease statis** (MAC → IP tetap),
> **simple queue** (limit bandwidth sesuai paket), dan memasukkan IP ke address-list
> **`pelanggan-aktif`** (izin internet di firewall). Perangkat dapat internet hanya jika
> MAC-nya terdaftar **dan** statusnya aktif.

---

## Checklist cepat (TL;DR)

**Pasang pelanggan baru:**

- [ ] TP-Link **mode Router**, WAN = DHCP, colok WAN ke jaringan MikroTik, nyalakan
- [ ] Panel → **Pelanggan → Tambah Pelanggan**
- [ ] Isi **Nama / No HP / Alamat**
- [ ] **MAC** → klik **Deteksi perangkat baru** → pilih TP-Link (atau ketik MAC WAN)
- [ ] Pilih **Paket** (kecepatan + durasi)
- [ ] **Status Bayar** → `Lunas` / `Belum Bayar`
- [ ] Klik **Tambah Pelanggan**
- [ ] **Reboot TP-Link** → ambil IP statis → **internet jalan** ✅

> Aktivasi internet **otomatis**: pelanggan baru default **status Aktif**, panel langsung
> membuat lease + queue + memasukkan ke `pelanggan-aktif`. **Tidak perlu klik "Aktifkan".**
> Tombol **Aktifkan** hanya untuk pelanggan yang sebelumnya **Suspend**.

**Aktifkan yang sedang Suspend:**

- [ ] Detail pelanggan → **Aktifkan** (atau **Bayar** → otomatis aktif) → internet nyala lagi

---

## 0. Prasyarat penting: TP-Link harus mode Router

Router pelanggan (TP-Link/lainnya) **wajib mode Router/Gateway**, bukan Access Point/Bridge:

- Port **WAN/Internet** TP-Link → colok ke jaringan MikroTik (lewat switch/AP di sisi `ether4`).
- **WAN type = Dynamic IP (DHCP)**.
- NAT aktif (default mode Router). WiFi/SSID rumah diatur di sisi LAN TP-Link.

Kenapa? Karena model panel = **1 rumah = 1 perangkat WAN = 1 MAC**. Yang didaftarkan di
panel adalah **MAC port WAN TP-Link**. Kalau TP-Link dipasang **AP/Bridge mode**, tiap HP/laptop
pelanggan minta IP sendiri (banyak MAC) → hanya 1 yang dapat internet → **model rusak**.

**Cara lihat MAC WAN TP-Link:** stiker di badan perangkat (label "MAC"), atau halaman admin
TP-Link → _Status / Internet → MAC Address (WAN)_. Jangan aktifkan fitur **MAC Clone** di WAN —
itu mengubah MAC dan membuat binding tidak cocok.

---

## 1. Pasang fisik & nyalakan TP-Link

1. Pasang TP-Link mode Router (lihat bagian 0), WAN = DHCP.
2. Colok kabel dari jaringan MikroTik ke port WAN TP-Link, lalu nyalakan.
3. Saat ini TP-Link akan mendapat **IP dinamis sementara** (rentang `.201–.254`), tapi
   **belum ada internet** karena belum terdaftar. Ini normal.

---

## 2. Daftarkan di panel

1. Buka menu **Pelanggan → Tambah Pelanggan**.
2. Isi **Nama**, **No HP**, **Alamat**.
3. **MAC Address** — klik tombol **"Deteksi perangkat baru"**:
   - Akan muncul daftar perangkat yang baru tersambung tapi belum terdaftar (MAC + IP + nama host).
   - Pilih perangkat TP-Link yang barusan dinyalakan → MAC terisi otomatis.
   - Kalau belum muncul: pastikan TP-Link sudah menyala & WAN=DHCP, lalu klik **"Pindai ulang"**.
   - Alternatif: ketik MAC WAN manual (format `AA:BB:CC:DD:EE:FF`).
4. Pilih **Paket** (menentukan kecepatan + durasi/siklus tagihan).
5. **Status Bayar**: `Lunas` jika sudah bayar pemasangan, atau `Belum Bayar`.
6. Klik **Tambah Pelanggan**.

> **Batasi jumlah perangkat?** Tidak bisa dari panel/MikroTik — karena TP-Link mode Router
> (NAT) membuat seluruh rumah tampil sebagai **1 IP**, MikroTik tak bisa melihat perangkat di
> belakangnya. Kalau perlu batas jumlah perangkat, atur **di TP-Link pelanggan** (mis.
> _DHCP → Max clients_ atau batas jumlah client WiFi). Panel hanya mengatur **kecepatan** (paket).

Saat disimpan, panel otomatis:

- Memberi **IP statis** dari rentang `.2–.200` (menghindari IP yang sedang dipakai perangkat lain).
- Membuat **DHCP lease** MAC → IP statis (lease dinamis lama otomatis dibersihkan).
- Membuat **simple queue** sesuai kecepatan paket.
- Memasukkan IP ke **`pelanggan-aktif`** (izin internet).
- Mengirim notifikasi **Discord** dan mencatat **audit log**.

---

## 3. Reboot TP-Link → internet jalan

Setelah terdaftar, **reboot TP-Link** (atau tunggu DHCP renew) supaya WAN-nya mengambil
**IP statis** yang baru. Begitu dapat IP statis:

- Gateway & DNS didapat otomatis dari MikroTik.
- Traffic di-NAT keluar → **internet jalan**, dengan **kecepatan sesuai paket**.

Selesai. Pelanggan tidak perlu setting IP manual.

---

## 4. Verifikasi

- Menu **Pelanggan**: status **Aktif**, IP & paket sesuai.
- Menu **Monitoring**: pelanggan muncul, **"di address-list" = ya**, jumlah koneksi mulai terlihat.
- Tes browsing dari perangkat di rumah pelanggan.

---

## 5. Operasi harian

| Aksi                            | Di panel                                           | Yang terjadi                                                                                                                                                                                               |
| ------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Terima pembayaran**           | Detail pelanggan → **Bayar** (isi jumlah + metode) | Masa aktif diperpanjang **sesuai durasi paket**, dihitung dari tanggal expire lama (bayar lebih awal tidak hangus). Kalau sebelumnya suspend → otomatis **diaktifkan**. Tercatat siapa pencatat + periode. |
| **Ganti paket**                 | Detail → **Ganti Paket**                           | Queue di MikroTik diubah ke kecepatan paket baru.                                                                                                                                                          |
| **Ganti MAC** (ganti perangkat) | Detail → **Ganti MAC**                             | Lease lama dihapus, lease baru dibuat untuk MAC baru. Reboot perangkat baru agar dapat IP.                                                                                                                 |
| **Suspend**                     | Detail → **Suspend**                               | IP dikeluarkan dari `pelanggan-aktif` → **internet diblok total**.                                                                                                                                         |
| **Aktifkan**                    | Detail → **Aktifkan**                              | IP dimasukkan lagi + queue di-set ke kecepatan paket.                                                                                                                                                      |
| **Hapus**                       | Detail → **Hapus**                                 | Lease, queue, dan izin di MikroTik dihapus.                                                                                                                                                                |

Otomatis oleh sistem (cron, zona **WIB**):

- **00:00** — pelanggan yang expire & belum lunas → **auto-suspend** (tercatat di audit).
- **08:00** — reminder Discord untuk yang akan expire ≤ 3 hari.

Semua aksi tercatat di menu **Riwayat Aktivitas** (siapa, kapan, apa).

---

## 6. Kalau internet tidak jalan

Cek berurutan:

1. **TP-Link mode Router & WAN=DHCP?** Kalau AP/Bridge mode → ubah ke Router (penyebab paling sering).
2. **MAC yang didaftarkan = MAC WAN TP-Link?** Cek di detail pelanggan vs label/halaman TP-Link.
   Salah MAC → perangkat tidak dapat IP statis. Pakai **Ganti MAC** untuk koreksi.
3. **Sudah reboot TP-Link** setelah didaftarkan? Diperlukan agar ambil IP statis baru.
4. **Status pelanggan = Aktif?** Kalau Suspend (mis. nunggak) → internet diblok. Terima bayar / Aktifkan.
5. **MAC Clone di TP-Link nonaktif?** Clone mengubah MAC → binding tidak cocok.
6. Menu **Monitoring** → cek apakah IP pelanggan ada di **`pelanggan-aktif`** dan ada koneksi.

---

## Catatan teknis singkat

- Rentang IP **statis pelanggan** = `IP_POOL_START..IP_POOL_END` (default `.2–.200`).
- Rentang IP **dinamis (perangkat baru/belum terdaftar)** = `(IP_POOL_END+1)..254` (default `.201–.254`).
  Pemisahan ini mencegah bentrok; "Deteksi perangkat baru" membaca perangkat di jaringan ini.
- Pada router yang **sudah live** sejak sebelum update ini, pool dinamis lama mungkin masih
  `.10–.254`. Pembuatan pelanggan tetap aman karena panel menghindari IP yang sedang terpakai,
  tapi sebaiknya pool di MikroTik disetel ke `.201–.254` agar rapi.

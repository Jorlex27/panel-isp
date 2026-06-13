# MikroTik RB941-2nD — Setup dari Nol ke Monitoring Grafana

> Panduan lengkap konfigurasi MikroTik hAP lite (RB941-2nD) dari factory reset sampai monitoring eksternal dengan Grafana + Prometheus.

---

## Daftar Isi

- [Spesifikasi Hardware](#spesifikasi-hardware)
- [Yang Dibutuhkan](#yang-dibutuhkan)
- [Fase 1 — Koneksi Fisik & Akses Pertama](#fase-1--koneksi-fisik--akses-pertama)
- [Fase 2 — Konfigurasi WAN + LAN + NAT](#fase-2--konfigurasi-wan--lan--nat)
- [Fase 3 — DHCP + Bandwidth Limit + Max User](#fase-3--dhcp--bandwidth-limit--max-user)
- [Fase 4 — Firewall + Keamanan Dasar](#fase-4--firewall--keamanan-dasar)
- [Fase 5 — SNMP + Monitoring Grafana](#fase-5--snmp--monitoring-grafana)
- [Ringkasan Port & Akses](#ringkasan-port--akses)

---

## Spesifikasi Hardware

| Komponen         | Detail                                     |
| ---------------- | ------------------------------------------ |
| Model            | RB941-2nD (hAP lite)                       |
| CPU              | QCA9533, 650 MHz, 1 core                   |
| RAM              | 32 MB ⚠️                                   |
| Storage          | 16 MB Flash ⚠️                             |
| Ethernet         | 4x Fast Ethernet (10/100 Mbps)             |
| WiFi             | 2.4 GHz, 802.11b/g/n, dual chain, 300 Mbps |
| RouterOS License | Level 4                                    |
| Konsumsi daya    | 3.5W max                                   |

> **Catatan:** RAM 32 MB sangat terbatas. Jangan jalankan The Dude, User Manager, atau VPN server di router ini. Monitoring (Grafana/Prometheus) harus dijalankan di PC/VPS terpisah.

---

## Yang Dibutuhkan

- PC/laptop dengan WinBox atau browser
- Kabel LAN minimal 2 buah
  - Kabel 1: ISP/modem → port `ether1` MikroTik
  - Kabel 2: port `ether2/3/4` MikroTik → PC kamu
- VPS atau PC terpisah dengan Docker (untuk fase monitoring)
- MikroTik RB941-2nD dalam kondisi factory reset

**Cara reset ke factory default:**
Tahan tombol reset di belakang router saat power dinyalakan, tahan ±5 detik hingga lampu berkedip, lalu lepas.

---

## Fase 1 — Koneksi Fisik & Akses Pertama

### Topologi kabel

```
ISP/Modem ──[kabel]──▶ [ether1] MikroTik RB941 [ether2] ──[kabel]──▶ PC kamu
                                                [ether3] ──▶ client lain
                                                [ether4] ──▶ client lain
                                                [WiFi]   ──▶ device wireless
```

### Default setelah reset

| Parameter | Nilai                    |
| --------- | ------------------------ |
| IP Router | `192.168.88.1`           |
| Username  | `admin`                  |
| Password  | _(kosong)_               |
| DHCP      | Aktif di ether2–4 & WiFi |

### Akses via WinBox (recommended)

1. Download WinBox di [mikrotik.com/download](https://mikrotik.com/download) (tersedia Windows & Mac)
2. Sambungkan PC ke port `ether2`, `ether3`, atau `ether4`
3. Buka WinBox → tab **Neighbors** → router akan muncul
4. Klik MAC address router → **Connect**

### Akses via browser (alternatif)

```
http://192.168.88.1
```

Login dengan user `admin`, password kosong.

---

## Fase 2 — Konfigurasi WAN + LAN + NAT

Buka **New Terminal** di WinBox (atau via SSH/WebFig), jalankan perintah berikut.

### Set IP LAN

```bash
/ip address add address=192.168.1.1/24 interface=ether2 comment="LAN"
```

### Setup WAN via DHCP dari ISP

```bash
/ip dhcp-client add interface=ether1 disabled=no comment="WAN dari ISP"
```

Verifikasi IP dari ISP sudah masuk:

```bash
/ip dhcp-client print
# Status harus: bound — ada IP address yang assigned
```

Jika ISP menggunakan IP statis, ganti dengan:

```bash
/ip address add address=<IP-dari-ISP>/24 interface=ether1
/ip route add dst-address=0.0.0.0/0 gateway=<IP-gateway-ISP>
```

### NAT Masquerade

```bash
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="NAT internet"
```

### DNS

```bash
/ip dns set servers=8.8.8.8,1.1.1.1 allow-remote-requests=yes
```

### Verifikasi koneksi internet

```bash
/ping 8.8.8.8 count=4
```

---

## Fase 3 — DHCP + Bandwidth Limit + Max User

### DHCP Server

```bash
# Buat pool IP untuk client
/ip pool add name=pool-lan ranges=192.168.1.10-192.168.1.100

# Buat DHCP server
/ip dhcp-server add \
  name=dhcp-lan \
  interface=ether2 \
  address-pool=pool-lan \
  lease-time=1d \
  disabled=no

# Set informasi jaringan
/ip dhcp-server network add \
  address=192.168.1.0/24 \
  gateway=192.168.1.1 \
  dns-server=8.8.8.8,1.1.1.1
```

### Limit maksimal pengguna

```bash
# Maksimal 15 device bisa dapat IP sekaligus
/ip dhcp-server set dhcp-lan lease-limit=15
```

### Bandwidth limit dengan PCQ (Per Connection Queue)

PCQ membagi bandwidth secara adil ke semua user yang aktif.

```bash
# Buat tipe queue PCQ
/queue type add name=pcq-down kind=pcq pcq-classifier=dst-address pcq-rate=2M pcq-limit=50
/queue type add name=pcq-up   kind=pcq pcq-classifier=src-address pcq-rate=512k pcq-limit=50

# Terapkan ke seluruh jaringan LAN
/queue simple add \
  name="limit-all" \
  target=192.168.1.0/24 \
  queue=pcq-up/pcq-down \
  max-limit=20M/10M \
  comment="Total 20M down / 10M up dibagi rata"
```

> **Cara kerja PCQ:** Total bandwidth 20 Mbps dibagi merata. 1 user aktif = dapat penuh 2 Mbps. 10 user aktif = masing-masing 2 Mbps (dibatasi oleh `pcq-rate`).

### Limit khusus per IP (opsional)

```bash
/queue simple add \
  name="vip-192.168.1.10" \
  target=192.168.1.10/32 \
  max-limit=5M/2M \
  place-before=limit-all \
  comment="PC khusus — 5M down / 2M up"
```

### Cek queue aktif

```bash
/queue simple print
/queue simple monitor
```

---

## Fase 4 — Firewall + Keamanan Dasar

### Rules firewall

```bash
# Izinkan koneksi established/related (wajib ada di paling atas)
/ip firewall filter add chain=input  connection-state=established,related action=accept comment="Allow established input"
/ip firewall filter add chain=forward connection-state=established,related action=accept comment="Allow established forward"

# Drop koneksi invalid
/ip firewall filter add chain=input  connection-state=invalid action=drop comment="Drop invalid"
/ip firewall filter add chain=forward connection-state=invalid action=drop

# Izinkan akses ke router hanya dari LAN
/ip firewall filter add chain=input in-interface=ether2 action=accept comment="Allow LAN to router"

# Izinkan ICMP (ping) — opsional
/ip firewall filter add chain=input protocol=icmp action=accept comment="Allow ICMP"

# Blok semua akses dari WAN ke router
/ip firewall filter add chain=input in-interface=ether1 action=drop comment="Drop WAN to router"
```

### Ganti password admin (WAJIB)

```bash
/user set admin password="passwordKuatKamu123!"
```

### Nonaktifkan service yang tidak dipakai

```bash
/ip service set telnet  disabled=yes
/ip service set ftp     disabled=yes
/ip service set api-ssl disabled=yes
/ip service set www-ssl disabled=yes
# Yang dibiarkan aktif: www (80), winbox (8291), api (8728)
```

### Cek urutan rules firewall

```bash
/ip firewall filter print
```

> **Penting:** Urutan rules firewall sangat berpengaruh. Rules diproses dari atas ke bawah, dan berhenti di rule pertama yang cocok. Pastikan `established/related` selalu di posisi paling atas.

---

## Fase 5 — SNMP + Monitoring Grafana

Monitoring dijalankan di **VPS atau PC terpisah** menggunakan Docker. Router hanya mengirim data via SNMP/API.

### 5a. Aktifkan SNMP di MikroTik

```bash
/snmp set enabled=yes contact="admin" location="rumah" trap-version=2
/snmp community set [ find default=yes ] name=public addresses=0.0.0.0/0
```

### 5b. Buat user API khusus monitoring

```bash
/user group add name=monitoring policy=api,read,winbox,test
/user add \
  name=mktxp-user \
  group=monitoring \
  password=monitoring123 \
  comment="Grafana exporter user"
```

### 5c. Struktur folder di VPS/PC

```
mikrotik-monitoring/
├── docker-compose.yml
├── prometheus.yml
└── mktxp/
    └── mktxp.conf
```

```bash
mkdir -p mikrotik-monitoring/mktxp
cd mikrotik-monitoring
```

### 5d. File konfigurasi mktxp

Buat `mktxp/mktxp.conf`:

```ini
[RB941-Rumah]
    enabled = True
    hostname = 192.168.1.1
    port = 8728
    username = mktxp-user
    password = monitoring123
    use_ssl = False
    no_ssl_certificate = False
    ssl_certificate_verify = False
    plaintext_login = True

    dhcp = True
    dhcp_lease = True
    interfaces = True
    monitor = True
    routes = True
    firewall = True
    queue = True
    resource = True
    wireless = True
    wireless_clients = True
```

### 5e. File docker-compose.yml

```yaml
services:
  mktxp:
    image: ghcr.io/akpw/mktxp:latest
    container_name: mktxp
    volumes:
      - ./mktxp:/root/mktxp
    restart: unless-stopped
    networks:
      - monitoring

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.retention.time=30d"
    restart: unless-stopped
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped
    networks:
      - monitoring

volumes:
  prometheus_data:
  grafana_data:

networks:
  monitoring:
    driver: bridge
```

### 5f. File prometheus.yml

```yaml
global:
  scrape_interval: 60s
  evaluation_interval: 60s

scrape_configs:
  - job_name: "mktxp"
    static_configs:
      - targets: ["mktxp:49090"]
```

### 5g. Jalankan stack monitoring

```bash
docker compose up -d

# Cek semua container berjalan
docker compose ps

# Lihat log jika ada masalah
docker compose logs mktxp -f
```

### 5h. Setup Grafana dashboard

1. Buka browser: `http://IP-VPS:3000`
2. Login: `admin` / `admin123`
3. Masuk ke **Connections → Data Sources → Add data source → Prometheus**
4. URL: `http://prometheus:9090` → **Save & Test**
5. Import dashboard siap pakai:
   - Klik **Dashboards → Import**
   - Masukkan Grafana dashboard ID: `14420`
   - Pilih datasource Prometheus → **Import**

Dashboard akan menampilkan:

- Traffic per interface (real-time)
- CPU & RAM usage router
- Jumlah DHCP lease aktif
- Queue stats & bandwidth usage per IP
- Wireless clients yang terhubung
- Uptime router

---

## Ringkasan Port & Akses

| Akses      | Alamat               | Keterangan                     |
| ---------- | -------------------- | ------------------------------ |
| WinBox     | `192.168.1.1:8291`   | App desktop, konfigurasi penuh |
| WebFig     | `http://192.168.1.1` | Browser, tanpa install         |
| SSH        | `192.168.1.1:22`     | Terminal langsung ke router    |
| Grafana    | `http://IP-VPS:3000` | Dashboard monitoring           |
| Prometheus | `http://IP-VPS:9090` | Metrics raw                    |

---

## Troubleshooting Umum

**Client tidak dapat IP dari DHCP:**

```bash
/ip dhcp-server lease print
/ip dhcp-server print
```

**Internet tidak jalan di client:**

```bash
# Cek NAT
/ip firewall nat print
# Cek routing
/ip route print
# Ping dari router
/ping 8.8.8.8 count=3
```

**mktxp tidak connect ke router:**

```bash
# Cek log container
docker compose logs mktxp

# Pastikan API port aktif di router
/ip service print
# Port 8728 (api) harus enabled
```

**Grafana tidak muncul data:**

```bash
# Cek Prometheus bisa scrape mktxp
# Buka http://IP-VPS:9090/targets
# Status harus "UP"
```

---

_Dokumentasi ini dibuat untuk MikroTik RB941-2nD dengan RouterOS v7.x_

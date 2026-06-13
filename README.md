# Panel ISP RT/RW Net — MikroTik + Hono + MongoDB

Sistem manajemen pelanggan internet berbasis web. Semua kontrol (limit bandwidth, suspend, aktifkan) dilakukan dari satu tempat — MikroTik kamu — lewat API otomatis.

---

## Arsitektur Singkat

```
Internet (ISP)
      ↓
[MikroTik RB941]  ← satu-satunya yang dikontrol
      ↓
[Switch / AP]
      ↓
[TP-Link A]  → 192.168.1.10  (Pak Budi, 5 Mbps)
[TP-Link B]  → 192.168.1.11  (Bu Sari, 2 Mbps)
[TP-Link C]  → 192.168.1.12  (Pak Joko, 10 Mbps)
```

TP-Link pelanggan **hanya sebagai penyebar WiFi**. Semua kontrol cukup dari MikroTik karena seluruh traffic pelanggan melewatinya.

---

## Stack Teknologi

| Bagian          | Teknologi                      |
| --------------- | ------------------------------ |
| Router          | MikroTik RB941 (RouterOS)      |
| Backend         | Hono.js (Bun / Node)           |
| Database        | MongoDB                        |
| Notifikasi      | Discord (webhook)              |
| Jadwal otomatis | Cron job                       |
| Frontend        | HTML/JS sederhana (atau React) |

---

## Struktur Project

```
panel-isp/
├── src/
│   ├── index.ts              # Entry point Hono
│   ├── routes/
│   │   ├── pelanggan.ts      # CRUD pelanggan
│   │   ├── paket.ts          # CRUD paket
│   │   └── pembayaran.ts     # Input & history bayar
│   ├── services/
│   │   ├── mikrotik.ts       # Semua perintah ke RouterOS API
│   │   └── discord.ts        # Kirim notifikasi Discord (webhook)
│   ├── jobs/
│   │   └── cron.ts           # Auto-suspend & reminder
│   ├── models/
│   │   ├── Pelanggan.ts
│   │   ├── Paket.ts
│   │   └── Langganan.ts
│   └── db.ts                 # Koneksi MongoDB
├── .env
├── package.json
└── README.md
```

---

## Skema MongoDB

### Collection: `pelanggan`

```json
{
  "_id": "ObjectId",
  "nama": "Pak Budi",
  "no_hp": "08123456789",
  "alamat": "Jl. Melati No. 3",
  "mac_address": "aa:bb:cc:dd:ee:01",
  "ip_address": "192.168.1.10",
  "status": "aktif"
}
```

> `mac_address` adalah MAC dari TP-Link pelanggan, bukan device HP/laptop mereka.

### Collection: `paket`

```json
{
  "_id": "ObjectId",
  "nama": "Silver",
  "harga_bulanan": 100000,
  "speed_down": 5,
  "speed_up": 2,
  "deskripsi": "Cocok untuk 3-4 device"
}
```

### Collection: `langganan`

```json
{
  "_id": "ObjectId",
  "pelanggan_id": "ObjectId",
  "paket_id": "ObjectId",
  "tanggal_mulai": "2025-01-01",
  "tanggal_expire": "2025-02-01",
  "status_bayar": "lunas",
  "history_pembayaran": [
    { "tanggal": "2025-01-01", "jumlah": 100000, "metode": "transfer" }
  ]
}
```

---

## Konfigurasi MikroTik

Sebelum mulai coding, siapkan ini di MikroTik:

### 1. Aktifkan RouterOS API

```
/ip service
set api disabled=no port=8728
```

> Untuk keamanan, batasi akses API hanya dari IP server kamu:
> `/ip service set api address=192.168.1.x/32`

### 2. Buat user khusus untuk API

```
/user add name=panel-api password=gantipassword group=full
```

### 3. DHCP static lease (contoh)

```
/ip dhcp-server lease
add address=192.168.1.10 mac-address=AA:BB:CC:DD:EE:01 comment="Pak Budi"
add address=192.168.1.11 mac-address=AA:BB:CC:DD:EE:02 comment="Bu Sari"
```

### 4. Simple Queue (contoh awal manual)

```
/queue simple
add name="Pak Budi" target=192.168.1.10 max-limit=5M/2M
add name="Bu Sari"  target=192.168.1.11 max-limit=2M/1M
```

> Setelah panel jadi, queue ini dibuat/diedit otomatis oleh sistem.

---

## Alur Pembuatan (Bertahap)

---

### Tahap 1 — Core (1–2 hari)

**Tujuan:** Tambah pelanggan lewat panel → langsung terset di MikroTik.

#### Langkah 1.1 — Setup project

```bash
mkdir panel-isp && cd panel-isp
bun init        # atau: npm init
bun add hono mongoose node-routeros
bun add -d typescript @types/bun
```

#### Langkah 1.2 — Koneksi MongoDB

```ts
// src/db.ts
import mongoose from "mongoose";

export async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("MongoDB terhubung");
}
```

#### Langkah 1.3 — Service MikroTik

```ts
// src/services/mikrotik.ts
import { RouterOSAPI } from "node-routeros";

const conn = new RouterOSAPI({
  host: process.env.MIKROTIK_HOST!,
  user: process.env.MIKROTIK_USER!,
  password: process.env.MIKROTIK_PASS!,
});

export async function tambahPelanggan(
  ip: string,
  mac: string,
  speedDown: number,
  speedUp: number,
  nama: string,
) {
  await conn.connect();

  // 1. DHCP static lease
  await conn.write("/ip/dhcp-server/lease/add", [
    `=address=${ip}`,
    `=mac-address=${mac}`,
    `=comment=${nama}`,
  ]);

  // 2. Simple Queue
  await conn.write("/queue/simple/add", [
    `=name=${nama}`,
    `=target=${ip}`,
    `=max-limit=${speedDown}M/${speedUp}M`,
  ]);

  conn.close();
}

export async function suspendPelanggan(ip: string) {
  await conn.connect();
  // Set limit ke 256k = praktis tidak bisa pakai internet
  const res = await conn.write("/queue/simple/print", [`?target=${ip}/32`]);
  if (res[0]) {
    await conn.write("/queue/simple/set", [
      `=.id=${res[0][".id"]}`,
      `=max-limit=256k/256k`,
    ]);
  }
  conn.close();
}

export async function aktifkanPelanggan(
  ip: string,
  speedDown: number,
  speedUp: number,
) {
  await conn.connect();
  const res = await conn.write("/queue/simple/print", [`?target=${ip}/32`]);
  if (res[0]) {
    await conn.write("/queue/simple/set", [
      `=.id=${res[0][".id"]}`,
      `=max-limit=${speedDown}M/${speedUp}M`,
    ]);
  }
  conn.close();
}

export async function hapusPelanggan(ip: string, nama: string) {
  await conn.connect();

  // Hapus queue
  const queue = await conn.write("/queue/simple/print", [`?name=${nama}`]);
  if (queue[0])
    await conn.write("/queue/simple/remove", [`=.id=${queue[0][".id"]}`]);

  // Hapus DHCP lease
  const lease = await conn.write("/ip/dhcp-server/lease/print", [
    `?address=${ip}`,
  ]);
  if (lease[0])
    await conn.write("/ip/dhcp-server/lease/remove", [
      `=.id=${lease[0][".id"]}`,
    ]);

  conn.close();
}
```

#### Langkah 1.4 — Route CRUD pelanggan

```ts
// src/routes/pelanggan.ts
import { Hono } from "hono";
import { Pelanggan } from "../models/Pelanggan";
import { Langganan } from "../models/Langganan";
import {
  tambahPelanggan,
  suspendPelanggan,
  aktifkanPelanggan,
  hapusPelanggan,
} from "../services/mikrotik";

const app = new Hono();

// GET semua pelanggan
app.get("/", async (c) => {
  const data = await Pelanggan.find().lean();
  return c.json(data);
});

// POST tambah pelanggan baru
app.post("/", async (c) => {
  const body = await c.req.json();
  const pelanggan = await Pelanggan.create(body);

  const paket = await Paket.findById(body.paket_id);
  await tambahPelanggan(
    body.ip_address,
    body.mac_address,
    paket.speed_down,
    paket.speed_up,
    body.nama,
  );

  return c.json(pelanggan, 201);
});

// PATCH suspend
app.patch("/:id/suspend", async (c) => {
  const pelanggan = await Pelanggan.findByIdAndUpdate(
    c.req.param("id"),
    { status: "suspend" },
    { new: true },
  );
  await suspendPelanggan(pelanggan.ip_address);
  return c.json({ ok: true });
});

// PATCH aktifkan
app.patch("/:id/aktifkan", async (c) => {
  const pelanggan = await Pelanggan.findById(c.req.param("id"));
  const langganan = await Langganan.findOne({
    pelanggan_id: pelanggan._id,
  }).populate("paket_id");
  await aktifkanPelanggan(
    pelanggan.ip_address,
    langganan.paket_id.speed_down,
    langganan.paket_id.speed_up,
  );
  await pelanggan.updateOne({ status: "aktif" });
  return c.json({ ok: true });
});

// DELETE hapus pelanggan
app.delete("/:id", async (c) => {
  const pelanggan = await Pelanggan.findByIdAndDelete(c.req.param("id"));
  await hapusPelanggan(pelanggan.ip_address, pelanggan.nama);
  return c.json({ ok: true });
});

export default app;
```

#### Langkah 1.5 — Entry point

```ts
// src/index.ts
import { Hono } from "hono";
import { connectDB } from "./db";
import pelangganRoutes from "./routes/pelanggan";
import paketRoutes from "./routes/paket";

const app = new Hono();
await connectDB();

app.route("/pelanggan", pelangganRoutes);
app.route("/paket", paketRoutes);

export default app;
```

#### Langkah 1.6 — File .env

```env
MONGODB_URI=mongodb://localhost:27017/panel-isp
MIKROTIK_HOST=192.168.1.1
MIKROTIK_USER=panel-api
MIKROTIK_PASS=gantipassword
```

**Hasil Tahap 1:** Panel bisa tambah, suspend, aktifkan, dan hapus pelanggan — semua langsung tersinkron ke MikroTik.

---

### Tahap 2 — Billing (2–3 hari)

**Tujuan:** Catat pembayaran, auto-suspend saat expire.

#### Langkah 2.1 — Route pembayaran

```ts
// src/routes/pembayaran.ts
app.post("/:id/bayar", async (c) => {
  const body = await c.req.json(); // { jumlah, metode }
  const bulan = 30 * 24 * 60 * 60 * 1000;

  const langganan = await Langganan.findOne({
    pelanggan_id: c.req.param("id"),
  });
  const expire_baru = new Date(Date.now() + bulan);

  await langganan.updateOne({
    tanggal_expire: expire_baru,
    status_bayar: "lunas",
    $push: { history_pembayaran: { ...body, tanggal: new Date() } },
  });

  // Aktifkan jika sedang suspend
  const pelanggan = await Pelanggan.findById(c.req.param("id"));
  if (pelanggan.status === "suspend") {
    await aktifkanPelanggan(/* ... */);
    await pelanggan.updateOne({ status: "aktif" });
  }

  return c.json({ ok: true, expire: expire_baru });
});
```

#### Langkah 2.2 — Cron job auto-suspend

```ts
// src/jobs/cron.ts
import cron from "node-cron";
import { Langganan } from "../models/Langganan";
import { Pelanggan } from "../models/Pelanggan";
import { suspendPelanggan } from "../services/mikrotik";
import { kirimDiscord } from "../services/discord";

// Setiap hari jam 00:00 — suspend yang expire hari ini
cron.schedule("0 0 * * *", async () => {
  const sekarang = new Date();
  const expire = await Langganan.find({
    tanggal_expire: { $lte: sekarang },
    status_bayar: { $ne: "lunas" },
  }).populate("pelanggan_id");

  for (const l of expire) {
    const p = l.pelanggan_id as any;
    await suspendPelanggan(p.ip_address);
    await Pelanggan.findByIdAndUpdate(p._id, { status: "suspend" });
    await kirimDiscord(
      `**${p.nama}** (${p.no_hp}) di-suspend karena paket habis masa berlaku.`,
      "Pelanggan Di-suspend",
    );
  }
});

// Setiap hari jam 08:00 — reminder 3 hari sebelum expire
cron.schedule("0 8 * * *", async () => {
  const tiga_hari = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const akan_expire = await Langganan.find({
    tanggal_expire: { $lte: tiga_hari, $gte: new Date() },
  }).populate("pelanggan_id");

  for (const l of akan_expire) {
    const p = l.pelanggan_id as any;
    const sisa = Math.ceil(
      (new Date(l.tanggal_expire).getTime() - Date.now()) / 86400000,
    );
    await kirimDiscord(
      `**${p.nama}** (${p.no_hp}) masa aktif tersisa ${sisa} hari. Segera ingatkan untuk perpanjang.`,
      "Reminder Expire",
    );
  }
});
```

**Hasil Tahap 2:** Bayar lewat panel → extend otomatis. Tidak bayar → suspend otomatis jam 00:00 + notif Discord.

---

### Tahap 3 — Polish (1–2 hari)

**Tujuan:** Dashboard ringkas, laporan, UX yang cukup nyaman dipakai.

#### Langkah 3.1 — Endpoint dashboard

```ts
app.get("/dashboard/summary", async (c) => {
  const [total, aktif, suspend, revenue] = await Promise.all([
    Pelanggan.countDocuments(),
    Pelanggan.countDocuments({ status: "aktif" }),
    Pelanggan.countDocuments({ status: "suspend" }),
    Langganan.aggregate([
      { $unwind: "$history_pembayaran" },
      {
        $match: {
          "history_pembayaran.tanggal": {
            $gte: new Date(new Date().setDate(1)),
          },
        },
      },
      { $group: { _id: null, total: { $sum: "$history_pembayaran.jumlah" } } },
    ]),
  ]);

  return c.json({
    total_pelanggan: total,
    aktif,
    suspend,
    revenue_bulan_ini: revenue[0]?.total ?? 0,
  });
});
```

#### Langkah 3.2 — Ganti paket

```ts
app.patch("/:id/ganti-paket", async (c) => {
  const { paket_id } = await c.req.json();
  const paket = await Paket.findById(paket_id);
  const pelanggan = await Pelanggan.findById(c.req.param("id"));

  // Update queue di MikroTik
  await conn.connect();
  const res = await conn.write("/queue/simple/print", [
    `?name=${pelanggan.nama}`,
  ]);
  await conn.write("/queue/simple/set", [
    `=.id=${res[0][".id"]}`,
    `=max-limit=${paket.speed_down}M/${paket.speed_up}M`,
  ]);
  conn.close();

  // Update langganan di DB
  await Langganan.findOneAndUpdate(
    { pelanggan_id: pelanggan._id },
    { paket_id },
  );
  return c.json({ ok: true });
});
```

**Hasil Tahap 3:** Dashboard ringkas, bisa ganti paket, laporan revenue per bulan.

---

## Urutan Pengerjaan yang Disarankan

```
1. Setup MikroTik (aktifkan API, buat user)
2. Bun init + install dependencies
3. Koneksi MongoDB & test
4. Buat service mikrotik.ts & test manual
5. Buat model Pelanggan, Paket, Langganan
6. Route CRUD pelanggan
7. Test end-to-end: tambah pelanggan → cek di MikroTik
8. Route pembayaran
9. Cron job auto-suspend
10. Notifikasi Discord
11. Dashboard summary
12. Frontend panel (opsional: HTML biasa atau React)
```

---

## Catatan Hardware

| Kondisi                                   | Rekomendasi                                       |
| ----------------------------------------- | ------------------------------------------------- |
| ≤ 15 pelanggan, bandwidth < 50 Mbps total | RB941 aman                                        |
| 15–30 pelanggan                           | Monitor CPU MikroTik, mulai pertimbangkan upgrade |
| > 30 pelanggan                            | Upgrade ke **hEX (RB750Gr3)** atau **hAP ac²**    |

---

## Lisensi

Proyek pribadi. Bebas dimodifikasi sesuai kebutuhan.

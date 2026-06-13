import type { ObjectId } from 'mongodb';

export interface PembayaranItem {
    tanggal: Date;
    jumlah: number;
    metode: string;
    /** Username admin yang mencatat pembayaran ini (untuk audit). */
    oleh?: string;
    /** Periode langganan yang dibayar (untuk struk/laporan). */
    periodeMulai?: Date;
    periodeSampai?: Date;
}

export interface PaketDoc {
    _id: ObjectId;
    nama: string;
    hargaBulanan: number;
    speedDown: number;
    speedUp: number;
    /** Lama satu siklus langganan dalam hari (default 30 bila tidak diisi). */
    durasiHari?: number;
    deskripsi?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PelangganDoc {
    _id: ObjectId;
    nama: string;
    noHp?: string;
    alamat?: string;
    macAddress: string;
    ipAddress: string;
    status: 'aktif' | 'suspend';
    maxPengguna?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface LanggananDoc {
    _id: ObjectId;
    pelangganId: ObjectId;
    paketId: ObjectId;
    tanggalMulai: Date;
    tanggalExpire: Date;
    statusBayar: 'lunas' | 'belum_bayar';
    historyPembayaran: PembayaranItem[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface LanggananPopulated extends LanggananDoc {
    pelanggan: PelangganDoc | null;
    paket: PaketDoc | null;
}

export interface PelangganPopulated extends PelangganDoc {
    langganan: LanggananDoc | null;
    paket: PaketDoc | null;
}

export interface PaketPopulated extends PaketDoc {
    langganans: LanggananDoc[];
}

export interface AdminDoc {
    _id: ObjectId;
    username: string;
    passwordHash: string;
}

export type AuditTargetType = 'pelanggan' | 'paket' | 'langganan' | 'auth';
export type AuditResult = 'success' | 'error';

export interface AuditLogDoc {
    _id: ObjectId;
    /** Username admin yang melakukan aksi (dari JWT). */
    actor: string;
    /** Kode aksi, mis. 'pelanggan.suspend', 'paket.update', 'auth.login'. */
    action: string;
    targetType?: AuditTargetType;
    targetId?: ObjectId;
    targetName?: string;
    /** Ringkasan singkat untuk ditampilkan (Bahasa Indonesia). */
    summary: string;
    /** Nilai sebelum/sesudah untuk aksi yang mengubah data (opsional). */
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    /** Konteks tambahan (mis. jumlah bayar, metode). */
    meta?: Record<string, unknown>;
    result: AuditResult;
    error?: string;
    createdAt: Date;
}

// Mirrors PaketDoc on server — field is hargaBulanan, not harga
export interface Paket {
    _id: string;
    nama: string;
    hargaBulanan: number;
    speedDown: number;
    speedUp: number;
    durasiHari?: number;
    createdAt: string;
    updatedAt: string;
}

// No _id — PembayaranItem on server has no id field
export interface HistoryPembayaran {
    jumlah: number;
    metode: string;
    tanggal: string;
    oleh?: string;
    periodeMulai?: string;
    periodeSampai?: string;
}

// Mirrors LanggananPopulated — server does $lookup pelanggan + paket
export interface Langganan {
    _id: string;
    pelangganId: string;
    paketId: string;
    tanggalMulai: string;
    tanggalExpire: string;
    statusBayar: 'lunas' | 'belum_bayar';
    historyPembayaran: HistoryPembayaran[];
    pelanggan?: Pelanggan;
    paket?: Paket;
}

// Mirrors PelangganPopulated — server $lookup puts paket at root, langganan is raw LanggananDoc
export interface Pelanggan {
    _id: string;
    nama: string;
    noHp: string;
    alamat: string;
    macAddress: string;
    ipAddress: string;
    status: 'aktif' | 'suspend';
    maxPengguna?: number;
    createdAt: string;
    updatedAt: string;
    langganan?: Omit<Langganan, 'pelanggan' | 'paket'>;
    paket?: Paket;
}

export interface DashboardSummary {
    totalPelanggan: number;
    aktif: number;
    suspend: number;
    revenueMonth: number;
    akanExpire: number;
}

export interface MonitoringOverview {
    generatedAt: string;
    ipPool: {
        network: string;
        prefix: string;
        rangeStart: number;
        rangeEnd: number;
        capacity: number;
        assignedInDb: number;
        freeSlots: number;
    };
    router: {
        ok: boolean;
        version?: string;
        uptime?: string;
        boardName?: string;
        architecture?: string;
        error?: string;
    };
    mikrotik: {
        ok: boolean;
        dhcpLeaseTotal: number;
        simpleQueueTotal: number;
        addressListPelangganAktif: number;
        error?: string;
    };
    dhcpLeasesInPoolNotInDb: {
        address: string;
        macAddress: string;
        dynamic: string;
        comment: string;
    }[];
    sampleQueues: { name: string; target: string; maxLimit: string }[];
}

export interface PelangganKoneksiRow {
    pelangganId: string;
    ipAddress: string;
    nama: string;
    status: 'aktif' | 'suspend';
    maxPengguna?: number;
    diAddressList: boolean;
    koneksi: number;
}

export interface PelangganKoneksiOverview {
    generatedAt: string;
    ok: boolean;
    error?: string;
    rows: PelangganKoneksiRow[];
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
}

// Mirrors AuditLogDoc on server
export interface AuditLog {
    _id: string;
    actor: string;
    action: string;
    targetType?: 'pelanggan' | 'paket' | 'langganan' | 'auth';
    targetId?: string;
    targetName?: string;
    summary: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    meta?: Record<string, unknown>;
    result: 'success' | 'error';
    error?: string;
    createdAt: string;
}

export interface AuditListResult {
    rows: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface AuditMeta {
    actors: string[];
    actions: string[];
}

export interface AuditFilter {
    actor?: string;
    action?: string;
    targetType?: string;
    q?: string;
    dari?: string;
    sampai?: string;
    page?: number;
    limit?: number;
}

export interface PelangganListResult {
    rows: Pelanggan[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PelangganFilter {
    q?: string;
    status?: 'aktif' | 'suspend';
    page?: number;
    limit?: number;
}

export function formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(dateStr));
}

export function formatDateTime(dateStr: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(dateStr));
}

export function formatStatus(status: 'aktif' | 'suspend'): string {
    return status === 'aktif' ? 'Aktif' : 'Suspend';
}

export function formatStatusBayar(status: 'lunas' | 'belum_bayar'): string {
    return status === 'lunas' ? 'Lunas' : 'Belum Bayar';
}

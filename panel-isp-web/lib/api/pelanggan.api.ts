import apiClient from './client';
import type { Pelanggan, Langganan, PelangganFilter, PelangganListResult } from '@/lib/types';

export async function listPelanggan(filter: PelangganFilter = {}): Promise<PelangganListResult> {
    const params: Record<string, string> = {};
    if (filter.q) params.q = filter.q;
    if (filter.status) params.status = filter.status;
    params.page = String(filter.page ?? 1);
    params.limit = String(filter.limit ?? 25);

    const res = await apiClient.get<PelangganListResult>('/pelanggan', { params });
    return res.data;
}

export async function getPelanggan(id: string): Promise<Pelanggan> {
    const res = await apiClient.get<Pelanggan>(`/pelanggan/${id}`);
    return res.data;
}

export interface CreatePelangganInput {
    nama: string;
    noHp?: string;
    alamat?: string;
    macAddress: string;
    paketId: string;
    statusBayar?: 'lunas' | 'belum_bayar';
    status?: 'aktif' | 'suspend';
    tanggalMulai?: string;
    tanggalExpire?: string;
    maxPengguna?: number;
}

export async function createPelanggan(input: CreatePelangganInput): Promise<Pelanggan> {
    const res = await apiClient.post<Pelanggan>('/pelanggan', input);
    return res.data;
}

export async function suspendPelanggan(id: string): Promise<Pelanggan> {
    const res = await apiClient.patch<Pelanggan>(`/pelanggan/${id}/suspend`);
    return res.data;
}

export async function aktifkanPelanggan(id: string): Promise<Pelanggan> {
    const res = await apiClient.patch<Pelanggan>(`/pelanggan/${id}/aktifkan`);
    return res.data;
}

export interface BayarInput {
    jumlah: number;
    metode: string;
}

export async function bayarPelanggan(
    id: string,
    input: BayarInput
): Promise<{ langganan: Langganan; expire: string }> {
    const res = await apiClient.post<{ langganan: Langganan; expire: string }>(
        `/pelanggan/${id}/bayar`,
        input
    );
    return res.data;
}

export interface GantiPaketInput {
    paketId: string;
}

export async function gantiPaket(id: string, input: GantiPaketInput): Promise<Pelanggan> {
    const res = await apiClient.patch<Pelanggan>(`/pelanggan/${id}/ganti-paket`, input);
    return res.data;
}

export async function deletePelanggan(id: string): Promise<void> {
    await apiClient.delete(`/pelanggan/${id}`);
}

export interface UpdateInfoInput {
    nama?: string;
    noHp?: string;
    alamat?: string;
    maxPengguna?: number | null;
}

export async function updatePelangganInfo(id: string, input: UpdateInfoInput): Promise<Pelanggan> {
    const res = await apiClient.patch<Pelanggan>(`/pelanggan/${id}`, input);
    return res.data;
}

export async function gantiMacPelanggan(id: string, macAddress: string): Promise<Pelanggan> {
    const res = await apiClient.patch<Pelanggan>(`/pelanggan/${id}/ganti-mac`, { macAddress });
    return res.data;
}

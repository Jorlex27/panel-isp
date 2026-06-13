import apiClient from './client';
import type { Paket } from '@/lib/types';

export async function listPaket(): Promise<Paket[]> {
    const res = await apiClient.get<Paket[]>('/paket');
    return res.data;
}

export interface CreatePaketInput {
    nama: string;
    hargaBulanan: number;
    speedDown: number;
    speedUp: number;
    durasiHari?: number;
}

export async function createPaket(input: CreatePaketInput): Promise<Paket> {
    const res = await apiClient.post<Paket>('/paket', input);
    return res.data;
}

export async function updatePaket(id: string, input: Partial<CreatePaketInput>): Promise<Paket> {
    const res = await apiClient.put<Paket>(`/paket/${id}`, input);
    return res.data;
}

export async function deletePaket(id: string): Promise<void> {
    await apiClient.delete(`/paket/${id}`);
}

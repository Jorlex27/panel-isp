import apiClient from './client';
import type { Langganan } from '@/lib/types';

export async function listLangganan(): Promise<Langganan[]> {
    const res = await apiClient.get<Langganan[]>('/langganan');
    return res.data;
}

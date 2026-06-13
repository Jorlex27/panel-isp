import apiClient from './client';
import type { MonitoringOverview, PelangganKoneksiOverview } from '@/lib/types';

export async function getMonitoringOverview(): Promise<MonitoringOverview> {
    const res = await apiClient.get<MonitoringOverview>('/monitoring/overview', { timeout: 25000 });
    return res.data;
}

export async function getMonitoringKoneksiPelanggan(): Promise<PelangganKoneksiOverview> {
    const res = await apiClient.get<PelangganKoneksiOverview>('/monitoring/koneksi-pelanggan', {
        timeout: 30000,
    });
    return res.data;
}

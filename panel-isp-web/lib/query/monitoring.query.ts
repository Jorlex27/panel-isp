import { useQuery } from '@tanstack/react-query';
import { getMonitoringKoneksiPelanggan, getMonitoringOverview } from '@/lib/api/monitoring.api';

export function useMonitoringOverview() {
    return useQuery({
        queryKey: ['monitoring-overview'],
        queryFn: getMonitoringOverview,
        refetchInterval: 45_000,
    });
}

export function useMonitoringKoneksiPelanggan() {
    return useQuery({
        queryKey: ['monitoring-koneksi-pelanggan'],
        queryFn: getMonitoringKoneksiPelanggan,
        refetchInterval: 20_000,
    });
}

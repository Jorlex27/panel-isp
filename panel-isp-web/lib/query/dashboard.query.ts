import { useQuery } from '@tanstack/react-query';
import { getSummary } from '@/lib/api/dashboard.api';

export function useDashboardSummary() {
    return useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: getSummary,
        refetchInterval: 60_000,
    });
}

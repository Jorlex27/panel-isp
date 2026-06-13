import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getAuditLogs, getAuditMeta } from '@/lib/api/audit.api';
import type { AuditFilter } from '@/lib/types';

export function useAuditLogs(filter: AuditFilter) {
    return useQuery({
        queryKey: ['audit', filter],
        queryFn: () => getAuditLogs(filter),
        placeholderData: keepPreviousData,
    });
}

export function useAuditMeta() {
    return useQuery({
        queryKey: ['audit-meta'],
        queryFn: getAuditMeta,
        staleTime: 60_000,
    });
}

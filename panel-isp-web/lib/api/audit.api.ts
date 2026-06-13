import apiClient from './client';
import type { AuditFilter, AuditListResult, AuditMeta } from '@/lib/types';

export async function getAuditLogs(filter: AuditFilter): Promise<AuditListResult> {
    const params: Record<string, string> = {};
    if (filter.actor) params.actor = filter.actor;
    if (filter.action) params.action = filter.action;
    if (filter.targetType) params.targetType = filter.targetType;
    if (filter.q) params.q = filter.q;
    if (filter.dari) params.dari = filter.dari;
    if (filter.sampai) params.sampai = filter.sampai;
    params.page = String(filter.page ?? 1);
    params.limit = String(filter.limit ?? 25);

    const res = await apiClient.get<AuditListResult>('/audit', { params });
    return res.data;
}

export async function getAuditMeta(): Promise<AuditMeta> {
    const res = await apiClient.get<AuditMeta>('/audit/meta');
    return res.data;
}

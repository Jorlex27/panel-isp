import apiClient from './client';
import type { DashboardSummary } from '@/lib/types';

export async function getSummary(): Promise<DashboardSummary> {
    const res = await apiClient.get<DashboardSummary>('/dashboard/summary');
    return res.data;
}

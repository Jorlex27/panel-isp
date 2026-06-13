'use client';

import { Users, UserCheck, UserX, DollarSign, Clock } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardSummary } from '@/lib/query/dashboard.query';
import { formatRupiah } from '@/lib/utils/format';

const stats = [
    {
        key: 'totalPelanggan' as const,
        label: 'Total Pelanggan',
        icon: Users,
        color: 'text-slate-600',
        bg: 'bg-slate-100',
    },
    {
        key: 'aktif' as const,
        label: 'Aktif',
        icon: UserCheck,
        color: 'text-green-600',
        bg: 'bg-green-50',
    },
    {
        key: 'suspend' as const,
        label: 'Suspend',
        icon: UserX,
        color: 'text-red-600',
        bg: 'bg-red-50',
    },
    {
        key: 'revenueMonth' as const,
        label: 'Revenue Bulan Ini',
        icon: DollarSign,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        format: 'rupiah',
    },
    {
        key: 'akanExpire' as const,
        label: 'Akan Expire 3 Hari',
        icon: Clock,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
    },
];

export default function DashboardPage() {
    const { data, isLoading } = useDashboardSummary();

    return (
        <>
            <Header title="Dashboard" />
            <main className="flex-1 p-6">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
                    {stats.map(({ key, label, icon: Icon, color, bg, format }) => (
                        <Card key={key}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-slate-500">
                                    {label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                                        <Icon className={`w-4 h-4 ${color}`} />
                                    </div>
                                    <span className="text-2xl font-bold text-slate-900">
                                        {isLoading
                                            ? '—'
                                            : format === 'rupiah' && data
                                            ? formatRupiah(data[key])
                                            : (data?.[key] ?? 0)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>
        </>
    );
}

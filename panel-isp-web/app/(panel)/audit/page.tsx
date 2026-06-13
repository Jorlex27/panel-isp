'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAuditLogs, useAuditMeta } from '@/lib/query/audit.query';
import { formatDateTime } from '@/lib/utils/format';
import type { AuditLog } from '@/lib/types';

const SEMUA = '__semua__';
const LIMIT = 25;

// Label ramah untuk kode aksi yang dipakai server.
const ACTION_LABELS: Record<string, string> = {
    'auth.login': 'Login',
    'auth.login_gagal': 'Login gagal',
    'pelanggan.create': 'Tambah pelanggan',
    'pelanggan.update_info': 'Ubah info pelanggan',
    'pelanggan.suspend': 'Suspend pelanggan',
    'pelanggan.aktifkan': 'Aktifkan pelanggan',
    'pelanggan.auto_suspend': 'Auto-suspend (sistem)',
    'pelanggan.bayar': 'Pembayaran',
    'pelanggan.ganti_paket': 'Ganti paket',
    'pelanggan.ganti_mac': 'Ganti MAC',
    'pelanggan.delete': 'Hapus pelanggan',
    'paket.create': 'Tambah paket',
    'paket.update': 'Ubah paket',
    'paket.delete': 'Hapus paket',
    'langganan.create': 'Tambah langganan',
};

function actionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action;
}

function actionBadgeClass(log: AuditLog): string {
    if (log.result === 'error') return 'bg-red-100 text-red-700 hover:bg-red-100';
    if (log.action.includes('delete') || log.action.includes('suspend'))
        return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
    if (log.action.includes('bayar')) return 'bg-green-100 text-green-700 hover:bg-green-100';
    return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
}

export default function AuditPage() {
    const [q, setQ] = useState('');
    const [qDebounced, setQDebounced] = useState('');
    const [actor, setActor] = useState(SEMUA);
    const [action, setAction] = useState(SEMUA);
    const [dari, setDari] = useState('');
    const [sampai, setSampai] = useState('');
    const [page, setPage] = useState(1);

    // Debounce pencarian teks agar tidak request setiap ketukan.
    useEffect(() => {
        const t = setTimeout(() => setQDebounced(q), 350);
        return () => clearTimeout(t);
    }, [q]);

    // Reset ke halaman 1 saat filter berubah — pola "adjust state during render".
    const filterKey = `${qDebounced}|${actor}|${action}|${dari}|${sampai}`;
    const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
    if (filterKey !== prevFilterKey) {
        setPrevFilterKey(filterKey);
        setPage(1);
    }

    const filter = useMemo(
        () => ({
            q: qDebounced || undefined,
            actor: actor === SEMUA ? undefined : actor,
            action: action === SEMUA ? undefined : action,
            dari: dari || undefined,
            // Sertakan seluruh hari pada tanggal "sampai".
            sampai: sampai ? `${sampai}T23:59:59` : undefined,
            page,
            limit: LIMIT,
        }),
        [qDebounced, actor, action, dari, sampai, page]
    );

    const { data, isLoading, isFetching, refetch } = useAuditLogs(filter);
    const { data: meta } = useAuditMeta();

    const rows = data?.rows ?? [];
    const totalPages = data?.totalPages ?? 1;
    const total = data?.total ?? 0;

    return (
        <>
            <Header title="Riwayat Aktivitas" />
            <main className="flex-1 p-6 space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Cari ringkasan / nama / aktor..."
                            className="pl-9"
                        />
                    </div>

                    <div className="w-44">
                        <Select value={action} onValueChange={(v) => setAction(v ?? SEMUA)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Semua aksi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={SEMUA}>Semua aksi</SelectItem>
                                {(meta?.actions ?? []).map((a) => (
                                    <SelectItem key={a} value={a}>
                                        {actionLabel(a)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-40">
                        <Select value={actor} onValueChange={(v) => setActor(v ?? SEMUA)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Semua aktor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={SEMUA}>Semua aktor</SelectItem>
                                {(meta?.actors ?? []).map((a) => (
                                    <SelectItem key={a} value={a}>
                                        {a}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={dari}
                            onChange={(e) => setDari(e.target.value)}
                            className="w-40"
                        />
                        <span className="text-slate-400 text-sm">s/d</span>
                        <Input
                            type="date"
                            value={sampai}
                            onChange={(e) => setSampai(e.target.value)}
                            className="w-40"
                        />
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="gap-2"
                    >
                        <RotateCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                        Muat ulang
                    </Button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-44">Waktu</TableHead>
                                <TableHead className="w-32">Aktor</TableHead>
                                <TableHead className="w-44">Aksi</TableHead>
                                <TableHead>Detail</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                        Memuat...
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                                        Tidak ada aktivitas
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((log) => (
                                    <TableRow key={log._id}>
                                        <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                                            {formatDateTime(log.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium">{log.actor}</TableCell>
                                        <TableCell>
                                            <Badge className={actionBadgeClass(log)}>
                                                {actionLabel(log.action)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-700">
                                            {log.summary}
                                            {log.error ? (
                                                <span className="text-red-500"> — {log.error}</span>
                                            ) : null}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>
                        {total > 0
                            ? `Menampilkan ${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} dari ${total}`
                            : '0 aktivitas'}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Sebelumnya
                        </Button>
                        <span>
                            Hal {page} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            className="gap-1"
                        >
                            Berikutnya
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </main>
        </>
    );
}

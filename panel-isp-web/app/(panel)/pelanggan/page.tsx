'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useListPelanggan } from '@/lib/query/pelanggan.query';
import { formatDate } from '@/lib/utils/format';

const SEMUA = '__semua__';
const LIMIT = 25;

export default function PelangganPage() {
    const [search, setSearch] = useState('');
    const [searchDebounced, setSearchDebounced] = useState('');
    const [status, setStatus] = useState(SEMUA);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(search), 350);
        return () => clearTimeout(t);
    }, [search]);

    // Reset ke halaman 1 saat filter berubah — pola "adjust state during render".
    const filterKey = `${searchDebounced}|${status}`;
    const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
    if (filterKey !== prevFilterKey) {
        setPrevFilterKey(filterKey);
        setPage(1);
    }

    const filter = useMemo(
        () => ({
            q: searchDebounced || undefined,
            status: status === SEMUA ? undefined : (status as 'aktif' | 'suspend'),
            page,
            limit: LIMIT,
        }),
        [searchDebounced, status, page]
    );

    const { data, isLoading } = useListPelanggan(filter);
    const list = data?.rows ?? [];
    const total = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;

    return (
        <>
            <Header title="Pelanggan" />
            <main className="flex-1 p-6">
                <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nama / IP / MAC / HP..."
                                className="pl-9"
                            />
                        </div>
                        <div className="w-40">
                            <Select value={status} onValueChange={(v) => setStatus(v ?? SEMUA)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Semua status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={SEMUA}>Semua status</SelectItem>
                                    <SelectItem value="aktif">Aktif</SelectItem>
                                    <SelectItem value="suspend">Suspend</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Link href="/pelanggan/baru">
                        <Button size="sm" className="gap-2">
                            <Plus className="w-4 h-4" />
                            Tambah Pelanggan
                        </Button>
                    </Link>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama</TableHead>
                                <TableHead>IP Address</TableHead>
                                <TableHead>Paket</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Max pengguna</TableHead>
                                <TableHead>Expire</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                        Memuat...
                                    </TableCell>
                                </TableRow>
                            ) : list.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                        {searchDebounced || status !== SEMUA
                                            ? 'Tidak ada hasil'
                                            : 'Belum ada pelanggan'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                list.map((p) => (
                                    <TableRow
                                        key={p._id}
                                        className="cursor-pointer hover:bg-slate-50"
                                        onClick={() => (window.location.href = `/pelanggan/${p._id}`)}
                                    >
                                        <TableCell className="font-medium">{p.nama}</TableCell>
                                        <TableCell className="font-mono text-sm">{p.ipAddress}</TableCell>
                                        <TableCell>{p.paket?.nama ?? '—'}</TableCell>
                                        <TableCell>
                                            <Badge
                                                className={
                                                    p.status === 'aktif'
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                        : 'bg-red-100 text-red-700 hover:bg-red-100'
                                                }
                                            >
                                                {p.status === 'aktif' ? 'Aktif' : 'Suspend'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600">
                                            {p.maxPengguna != null ? p.maxPengguna : 'Tanpa batas'}
                                        </TableCell>
                                        <TableCell>
                                            {p.langganan?.tanggalExpire
                                                ? formatDate(p.langganan.tanggalExpire)
                                                : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between text-sm text-slate-500 mt-4">
                    <span>
                        {total > 0
                            ? `Menampilkan ${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} dari ${total}`
                            : '0 pelanggan'}
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

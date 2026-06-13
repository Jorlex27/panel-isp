'use client';

import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useListLangganan } from '@/lib/query/langganan.query';
import { formatDate, formatStatusBayar } from '@/lib/utils/format';

export default function LanggananPage() {
    const { data: list = [], isLoading } = useListLangganan();
    const router = useRouter();

    return (
        <>
            <Header title="Langganan" />
            <main className="flex-1 p-6">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pelanggan</TableHead>
                                <TableHead>Paket</TableHead>
                                <TableHead>Status Bayar</TableHead>
                                <TableHead>Mulai</TableHead>
                                <TableHead>Expire</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                        Memuat...
                                    </TableCell>
                                </TableRow>
                            ) : list.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                                        Belum ada langganan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                list.map((l) => (
                                    <TableRow
                                        key={l._id}
                                        className="cursor-pointer hover:bg-slate-50"
                                        onClick={() => router.push(`/pelanggan/${l.pelangganId}`)}
                                    >
                                        <TableCell className="font-medium">{l.pelanggan?.nama ?? l.pelangganId}</TableCell>
                                        <TableCell>{l.paket?.nama ?? '—'}</TableCell>
                                        <TableCell>
                                            <Badge
                                                className={
                                                    l.statusBayar === 'lunas'
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                        : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                                }
                                            >
                                                {formatStatusBayar(l.statusBayar)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(l.tanggalMulai)}</TableCell>
                                        <TableCell>{formatDate(l.tanggalExpire)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </main>
        </>
    );
}

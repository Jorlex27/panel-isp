'use client';

import Link from 'next/link';
import { Activity, AlertTriangle, HardDrive, Loader2, Router, Server, Users } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { PelangganKoneksiRow } from '@/lib/types';
import { useMonitoringKoneksiPelanggan, useMonitoringOverview } from '@/lib/query/monitoring.query';

function koneksiNotes(row: PelangganKoneksiRow): string[] {
    const notes: string[] = [];
    if (row.status === 'aktif' && !row.diAddressList) notes.push('DB aktif, tidak di address-list');
    if (row.status === 'suspend' && row.diAddressList) notes.push('DB suspend, masih di address-list');
    return notes;
}

export default function MonitoringPage() {
    const { data, isLoading, isError, error } = useMonitoringOverview();
    const kx = useMonitoringKoneksiPelanggan();

    return (
        <>
            <Header title="Monitoring" />
            <main className="flex-1 p-6 space-y-6">
                <p className="text-sm text-slate-600 max-w-3xl">
                    Ringkasan pool IP (sesuai <code className="text-xs bg-slate-100 px-1 rounded">IP_POOL_*</code>),
                    status router dari MikroTik REST, perbandingan lease DHCP,{' '}
                    <strong>koneksi firewall per IP pelanggan</strong>, dan sampel antrian.
                </p>

                {isLoading && (
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Memuat data monitoring…
                    </div>
                )}

                {isError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {(error as Error)?.message ?? 'Gagal memuat monitoring'}
                    </div>
                )}

                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center gap-2">
                        <Users className="w-4 h-4 text-slate-500" />
                        <CardTitle className="text-sm font-medium text-slate-700">
                            Koneksi per pelanggan (IP dalam pool)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {kx.isLoading && (
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Memuat connection tracking…
                            </div>
                        )}
                        {kx.isError && (
                            <p className="text-sm text-red-700">
                                {(kx.error as Error)?.message ?? 'Gagal memuat koneksi'}
                            </p>
                        )}
                        {kx.data && (
                            <>
                                <div className="text-xs text-slate-400 font-mono">
                                    Diperbarui: {new Date(kx.data.generatedAt).toLocaleString('id-ID')}
                                </div>
                                {!kx.data.ok && kx.data.error && (
                                    <p className="text-amber-800 text-xs wrap-break-word">{kx.data.error}</p>
                                )}
                                <p className="text-xs text-slate-500 max-w-3xl">
                                    Angka koneksi dihitung dari{' '}
                                    <code className="bg-slate-100 px-1 rounded text-[11px]">ip/firewall/connection</code>{' '}
                                    pada MikroTik, dikelompokkan per alamat sumber IPv4 di subnet pool. Ini menaksir beban
                                    sesi (browser/tab/aplikasi), bukan jumlah perangkat fisik di balik router pelanggan.
                                </p>
                                {kx.data.rows.length === 0 ? (
                                    <p className="text-sm text-slate-400">Tidak ada pelanggan dengan IP di pool.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Pelanggan</TableHead>
                                                <TableHead>IP</TableHead>
                                                <TableHead>Status (DB)</TableHead>
                                                <TableHead>List MT</TableHead>
                                                <TableHead className="text-right">Koneksi</TableHead>
                                                <TableHead className="min-w-[140px]">Catatan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {kx.data.rows.map((row) => {
                                                const notes = koneksiNotes(row);
                                                return (
                                                    <TableRow key={row.pelangganId || row.ipAddress}>
                                                        <TableCell className="font-medium text-sm">
                                                            {row.pelangganId ? (
                                                                <Link
                                                                    href={`/pelanggan/${row.pelangganId}`}
                                                                    className="text-blue-700 hover:underline"
                                                                >
                                                                    {row.nama || '—'}
                                                                </Link>
                                                            ) : (
                                                                row.nama || '—'
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {row.ipAddress}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                className={
                                                                    row.status === 'aktif'
                                                                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                                                        : 'bg-red-100 text-red-800 hover:bg-red-100'
                                                                }
                                                            >
                                                                {row.status === 'aktif' ? 'Aktif' : 'Suspend'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {row.diAddressList ? (
                                                                <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">
                                                                    pelanggan-aktif
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-slate-400 text-xs">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-sm">
                                                            {row.koneksi}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-slate-600">
                                                            {notes.length === 0 ? (
                                                                '—'
                                                            ) : (
                                                                <span className="flex flex-col gap-1">
                                                                    {notes.map((n) => (
                                                                        <Badge
                                                                            key={n}
                                                                            variant="outline"
                                                                            className="w-fit font-normal border-amber-300 text-amber-900 justify-start"
                                                                        >
                                                                            {n}
                                                                        </Badge>
                                                                    ))}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {data && (
                    <>
                        <div className="text-xs text-slate-400 font-mono">
                            Ringkasan lain · diperbarui:{' '}
                            {new Date(data.generatedAt).toLocaleString('id-ID')}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <Card>
                                <CardHeader className="pb-2 flex flex-row items-center gap-2">
                                    <HardDrive className="w-4 h-4 text-slate-500" />
                                    <CardTitle className="text-sm font-medium text-slate-700">
                                        Pool IP (database)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1 text-sm">
                                    <p>
                                        <span className="text-slate-500">Jaringan:</span>{' '}
                                        <span className="font-mono">{data.ipPool.network}</span>
                                    </p>
                                    <p>
                                        <span className="text-slate-500">Rentang host:</span>{' '}
                                        <span className="font-mono">
                                            {data.ipPool.prefix}.{data.ipPool.rangeStart} –{' '}
                                            {data.ipPool.prefix}.{data.ipPool.rangeEnd}
                                        </span>
                                    </p>
                                    <p>
                                        <span className="text-slate-500">Kapasitas slot:</span>{' '}
                                        <strong>{data.ipPool.capacity}</strong>
                                    </p>
                                    <p>
                                        <span className="text-slate-500">Terisi (DB):</span>{' '}
                                        <strong>{data.ipPool.assignedInDb}</strong>
                                    </p>
                                    <p>
                                        <span className="text-slate-500">Estimasi kosong:</span>{' '}
                                        <strong className="text-green-700">{data.ipPool.freeSlots}</strong>
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2 flex flex-row items-center gap-2">
                                    <Router className="w-4 h-4 text-slate-500" />
                                    <CardTitle className="text-sm font-medium text-slate-700">Router</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1 text-sm">
                                    {data.router.ok ? (
                                        <>
                                            <p>
                                                <span className="text-slate-500">Board:</span>{' '}
                                                {data.router.boardName ?? '—'}
                                            </p>
                                            <p>
                                                <span className="text-slate-500">Versi:</span>{' '}
                                                <span className="font-mono text-xs">
                                                    {data.router.version ?? '—'}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500">Uptime:</span>{' '}
                                                {data.router.uptime ?? '—'}
                                            </p>
                                            <p>
                                                <span className="text-slate-500">CPU arch:</span>{' '}
                                                {data.router.architecture ?? '—'}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-amber-800 text-xs wrap-break-word">
                                            {data.router.error ?? 'Tidak terhubung'}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2 flex flex-row items-center gap-2">
                                    <Server className="w-4 h-4 text-slate-500" />
                                    <CardTitle className="text-sm font-medium text-slate-700">
                                        Snapshot MikroTik
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1 text-sm">
                                    {data.mikrotik.ok ? (
                                        <>
                                            <p>
                                                DHCP leases (semua):{' '}
                                                <strong>{data.mikrotik.dhcpLeaseTotal}</strong>
                                            </p>
                                            <p>
                                                Simple queue: <strong>{data.mikrotik.simpleQueueTotal}</strong>
                                            </p>
                                            <p>
                                                Address-list pelanggan-aktif:{' '}
                                                <strong>{data.mikrotik.addressListPelangganAktif}</strong>
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-amber-800 text-xs wrap-break-word">
                                            {data.mikrotik.error ?? 'Gagal membaca MikroTik'}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {data.dhcpLeasesInPoolNotInDb.length > 0 && (
                            <Card className="border-amber-200">
                                <CardHeader className="pb-2 flex flex-row items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    <CardTitle className="text-sm font-medium text-amber-900">
                                        Lease di pool tanpa pelanggan di database
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>IP</TableHead>
                                                <TableHead>MAC</TableHead>
                                                <TableHead>Dynamic</TableHead>
                                                <TableHead>Komentar</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.dhcpLeasesInPoolNotInDb.map((r) => (
                                                <TableRow key={`${r.address}-${r.macAddress}`}>
                                                    <TableCell className="font-mono text-sm">{r.address}</TableCell>
                                                    <TableCell className="font-mono text-xs">{r.macAddress}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-xs">
                                                            {r.dynamic || '—'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600">{r.comment}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader className="pb-2 flex flex-row items-center gap-2">
                                <Activity className="w-4 h-4 text-slate-500" />
                                <CardTitle className="text-sm font-medium text-slate-700">
                                    Sampel simple queue (hingga 25)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {data.sampleQueues.length === 0 ? (
                                    <p className="text-sm text-slate-400">Tidak ada queue atau MikroTik tidak terbaca.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nama</TableHead>
                                                <TableHead>Target</TableHead>
                                                <TableHead>Max limit</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.sampleQueues.map((q) => (
                                                <TableRow key={q.name + q.target}>
                                                    <TableCell className="font-medium text-sm">{q.name}</TableCell>
                                                    <TableCell className="font-mono text-xs">{q.target}</TableCell>
                                                    <TableCell className="font-mono text-xs">{q.maxLimit}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </main>
        </>
    );
}

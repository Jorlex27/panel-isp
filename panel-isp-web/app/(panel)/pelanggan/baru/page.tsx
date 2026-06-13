'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Radar, Loader2, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCreatePelanggan } from '@/lib/query/pelanggan.query';
import { useListPaket } from '@/lib/query/paket.query';
import { usePerangkatBaru } from '@/lib/query/monitoring.query';

const schema = z.object({
    nama: z.string().min(1, 'Nama wajib diisi'),
    noHp: z.string().optional(),
    alamat: z.string().optional(),
    macAddress: z.string().min(1, 'MAC address wajib diisi'),
    paketId: z.string().min(1, 'Paket wajib dipilih'),
    statusBayar: z.enum(['lunas', 'belum_bayar']),
    maxPengguna: z
        .union([z.number(), z.nan(), z.undefined()])
        .transform((v) => {
            if (v === undefined || (typeof v === 'number' && Number.isNaN(v))) return undefined;
            const f = Math.floor(v);
            if (f < 2 || f > 65535) return undefined;
            return f;
        })
        .pipe(z.union([z.undefined(), z.number().int().min(2).max(65535)]))
        .optional(),
});

type FormData = z.input<typeof schema>;

export default function TambahPelangganPage() {
    const router = useRouter();
    const { data: paketList = [] } = useListPaket();
    const createMutation = useCreatePelanggan();

    const [detectOpen, setDetectOpen] = useState(false);
    const {
        data: perangkat,
        isFetching: detecting,
        refetch: refetchPerangkat,
    } = usePerangkatBaru(detectOpen);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { statusBayar: 'belum_bayar' },
    });

    const pilihPerangkat = (mac: string) => {
        setValue('macAddress', mac, { shouldValidate: true });
        setDetectOpen(false);
        toast.success('MAC address terisi otomatis');
    };

    const onSubmit = handleSubmit(async (data) => {
        try {
            const payload = { ...data };
            if (payload.maxPengguna === undefined) delete payload.maxPengguna;
            const result = await createMutation.mutateAsync(payload);
            toast.success('Pelanggan berhasil ditambahkan');
            router.replace(`/pelanggan/${result._id}`);
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Gagal menambah pelanggan';
            toast.error(msg);
        }
    });

    return (
        <>
            <Header title="Tambah Pelanggan" />
            <main className="flex-1 p-6">
                <div className="max-w-2xl">
                    <Link
                        href="/pelanggan"
                        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke daftar
                    </Link>

                    <form onSubmit={onSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Nama</Label>
                                <Input {...register('nama')} placeholder="Budi Santoso" />
                                {errors.nama && <p className="text-xs text-red-500">{errors.nama.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label>No HP</Label>
                                <Input {...register('noHp')} placeholder="08123456789" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Alamat</Label>
                            <Input {...register('alamat')} placeholder="Jl. Mawar No. 5" />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label>MAC Address</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 h-7 text-xs"
                                    onClick={() => setDetectOpen(true)}
                                >
                                    <Radar className="w-3.5 h-3.5" />
                                    Deteksi perangkat baru
                                </Button>
                            </div>
                            <Input
                                {...register('macAddress')}
                                placeholder="AA:BB:CC:DD:EE:FF"
                                className="font-mono"
                            />
                            <p className="text-xs text-slate-500">
                                MAC port WAN TP-Link (mode Router, WAN = DHCP). Klik &quot;Deteksi&quot; untuk
                                mengambil dari perangkat yang baru tersambung.
                            </p>
                            {errors.macAddress && (
                                <p className="text-xs text-red-500">{errors.macAddress.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Paket</Label>
                                <Select
                                    value={watch('paketId') ?? ''}
                                    onValueChange={(v) => setValue('paketId', v ?? '')}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih paket" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paketList.map((p) => (
                                            <SelectItem key={p._id} value={p._id}>
                                                {p.nama}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.paketId && (
                                    <p className="text-xs text-red-500">{errors.paketId.message}</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label>Status Bayar</Label>
                                <Select
                                    value={watch('statusBayar')}
                                    onValueChange={(v) =>
                                        setValue('statusBayar', v as 'lunas' | 'belum_bayar')
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="belum_bayar">Belum Bayar</SelectItem>
                                        <SelectItem value="lunas">Lunas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Max pengguna / koneksi (opsional)</Label>
                            <Input
                                {...register('maxPengguna', { valueAsNumber: true })}
                                type="number"
                                min={2}
                                max={65535}
                                placeholder="Kosong = tanpa batas"
                            />
                            <p className="text-xs text-slate-500">
                                Batas koneksi TCP baru bersamaan dari IP pelanggan di MikroTik (firewall). Minimal 2
                                jika diisi.
                            </p>
                            {errors.maxPengguna && (
                                <p className="text-xs text-red-500">{errors.maxPengguna.message}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => router.push('/pelanggan')}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                                Tambah Pelanggan
                            </Button>
                        </div>
                    </form>
                </div>
            </main>

            <Dialog open={detectOpen} onOpenChange={setDetectOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Perangkat baru terdeteksi</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-500">
                        Perangkat yang sudah tersambung &amp; dapat IP tapi belum terdaftar. Pastikan TP-Link
                        mode Router (WAN = DHCP) dan baru dinyalakan, lalu pilih MAC-nya.
                    </p>
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => refetchPerangkat()}
                            disabled={detecting}
                        >
                            <RotateCw className={`w-3.5 h-3.5 ${detecting ? 'animate-spin' : ''}`} />
                            Pindai ulang
                        </Button>
                    </div>
                    <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                        {detecting ? (
                            <div className="py-8 text-center text-sm text-slate-400">
                                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                Memindai...
                            </div>
                        ) : perangkat && !perangkat.ok ? (
                            <div className="py-8 text-center text-sm text-red-500">
                                Gagal baca MikroTik: {perangkat.error ?? 'tidak diketahui'}
                            </div>
                        ) : !perangkat || perangkat.rows.length === 0 ? (
                            <div className="py-8 text-center text-sm text-slate-400">
                                Tidak ada perangkat baru. Nyalakan/hubungkan TP-Link lalu pindai ulang.
                            </div>
                        ) : (
                            perangkat.rows.map((d) => (
                                <button
                                    type="button"
                                    key={`${d.macAddress}-${d.ip}`}
                                    onClick={() => pilihPerangkat(d.macAddress)}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between"
                                >
                                    <div>
                                        <div className="font-mono text-sm">{d.macAddress}</div>
                                        <div className="text-xs text-slate-400">
                                            {d.hostName || 'tanpa nama'} · {d.ip}
                                        </div>
                                    </div>
                                    <span className="text-xs text-blue-600">Pilih</span>
                                </button>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Radar, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
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
import {
    useGetPelanggan,
    useSuspend,
    useAktifkan,
    useBayar,
    useGantiPaket,
    useDeletePelanggan,
    useUpdatePelangganInfo,
    useGantiMac,
} from '@/lib/query/pelanggan.query';
import { useListPaket } from '@/lib/query/paket.query';
import { usePerangkatBaru } from '@/lib/query/monitoring.query';
import { formatDate, formatRupiah, formatStatusBayar } from '@/lib/utils/format';

const bayarSchema = z.object({
    jumlah: z.number().min(1, 'Jumlah wajib diisi'),
    metode: z.string().min(1, 'Metode wajib diisi'),
});

type BayarForm = z.infer<typeof bayarSchema>;

const editInfoSchema = z.object({
    nama: z.string().min(1, 'Nama wajib diisi'),
    noHp: z.string().optional(),
    alamat: z.string().optional(),
});
type EditInfoForm = z.input<typeof editInfoSchema>;

export default function DetailPelangganPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();

    const { data: pel, isLoading } = useGetPelanggan(id);
    const { data: paketList = [] } = useListPaket();

    const suspendMut = useSuspend();
    const aktifkanMut = useAktifkan();
    const bayarMut = useBayar();
    const gantiPaketMut = useGantiPaket();
    const deleteMut = useDeletePelanggan();
    const updateInfoMut = useUpdatePelangganInfo();
    const gantiMacMut = useGantiMac();

    const [dialog, setDialog] = useState<'suspend' | 'aktifkan' | 'bayar' | 'ganti' | 'hapus' | 'edit' | 'ganti-mac' | null>(null);
    const [gantiPaketId, setGantiPaketId] = useState('');
    const [newMac, setNewMac] = useState('');
    const [macDetectOpen, setMacDetectOpen] = useState(false);
    const {
        data: perangkat,
        isFetching: detecting,
        refetch: refetchPerangkat,
    } = usePerangkatBaru(macDetectOpen);

    const bayarForm = useForm<BayarForm>({
        resolver: zodResolver(bayarSchema),
        defaultValues: { jumlah: 0, metode: '' },
    });

    const editInfoForm = useForm<EditInfoForm>({
        resolver: zodResolver(editInfoSchema),
        defaultValues: { nama: '', noHp: '', alamat: '' },
    });

    const handleSuspend = async () => {
        try {
            await suspendMut.mutateAsync(id);
            toast.success('Pelanggan disuspend');
            setDialog(null);
        } catch { toast.error('Gagal suspend'); }
    };

    const handleAktifkan = async () => {
        try {
            await aktifkanMut.mutateAsync(id);
            toast.success('Pelanggan diaktifkan');
            setDialog(null);
        } catch { toast.error('Gagal aktifkan'); }
    };

    const handleBayar = bayarForm.handleSubmit(async (data) => {
        try {
            await bayarMut.mutateAsync({ id, input: data });
            toast.success('Pembayaran dicatat');
            setDialog(null);
            bayarForm.reset();
        } catch { toast.error('Gagal catat pembayaran'); }
    });

    const handleGantiPaket = async () => {
        if (!gantiPaketId) return;
        try {
            await gantiPaketMut.mutateAsync({ id, input: { paketId: gantiPaketId } });
            toast.success('Paket berhasil diganti');
            setDialog(null);
        } catch { toast.error('Gagal ganti paket'); }
    };

    const handleHapus = async () => {
        try {
            await deleteMut.mutateAsync(id);
            toast.success('Pelanggan dihapus');
            router.replace('/pelanggan');
        } catch { toast.error('Gagal hapus pelanggan'); }
    };

    const handleEditInfo = editInfoForm.handleSubmit(async (data) => {
        try {
            await updateInfoMut.mutateAsync({
                id,
                input: {
                    nama: data.nama,
                    noHp: data.noHp,
                    alamat: data.alamat,
                },
            });
            toast.success('Info pelanggan diperbarui');
            setDialog(null);
        } catch { toast.error('Gagal update info'); }
    });

    const handleGantiMac = async () => {
        if (!newMac) return;
        try {
            await gantiMacMut.mutateAsync({ id, macAddress: newMac });
            toast.success('MAC address diperbarui');
            setDialog(null);
            setNewMac('');
        } catch { toast.error('Gagal ganti MAC'); }
    };

    if (isLoading) {
        return (
            <>
                <Header title="Detail Pelanggan" />
                <main className="flex-1 p-6 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </main>
            </>
        );
    }

    if (!pel) return null;

    const lang = pel.langganan;

    return (
        <>
            <Header title="Detail Pelanggan" />
            <main className="flex-1 p-6">
                <div className="max-w-3xl space-y-6">
                    <Link
                        href="/pelanggan"
                        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke daftar
                    </Link>

                    {/* Info + Aksi */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">{pel.nama}</h2>
                                <p className="text-sm text-slate-500 mt-0.5">{pel.noHp}</p>
                            </div>
                            <Badge
                                className={
                                    pel.status === 'aktif'
                                        ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                        : 'bg-red-100 text-red-700 hover:bg-red-100'
                                }
                            >
                                {pel.status === 'aktif' ? 'Aktif' : 'Suspend'}
                            </Badge>
                        </div>

                        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm mb-6">
                            <div>
                                <dt className="text-slate-500">Alamat</dt>
                                <dd className="font-medium text-slate-900">{pel.alamat}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">IP Address</dt>
                                <dd className="font-mono font-medium text-slate-900">{pel.ipAddress}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Paket</dt>
                                <dd className="font-medium text-slate-900">{pel.paket?.nama ?? '—'}</dd>
                            </div>
                            {lang && (
                                <>
                                    <div>
                                        <dt className="text-slate-500">Status Bayar</dt>
                                        <dd className="font-medium text-slate-900">
                                            {formatStatusBayar(lang.statusBayar)}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-slate-500">Expire</dt>
                                        <dd className="font-medium text-slate-900">
                                            {formatDate(lang.tanggalExpire)}
                                        </dd>
                                    </div>
                                </>
                            )}
                        </dl>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                            {pel.status === 'aktif' ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                    onClick={() => setDialog('suspend')}
                                >
                                    Suspend
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                    onClick={() => setDialog('aktifkan')}
                                >
                                    Aktifkan
                                </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => setDialog('bayar')}>
                                Catat Pembayaran
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => {
                                setGantiPaketId(pel.langganan?.paketId ?? '');
                                setDialog('ganti');
                            }}>
                                Ganti Paket
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => {
                                editInfoForm.reset({
                                    nama: pel.nama,
                                    noHp: pel.noHp ?? '',
                                    alamat: pel.alamat ?? '',
                                });
                                setDialog('edit');
                            }}>
                                Edit Info
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                onClick={() => { setNewMac(pel.macAddress); setMacDetectOpen(false); setDialog('ganti-mac'); }}
                            >
                                Ganti MAC
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50 ml-auto"
                                onClick={() => setDialog('hapus')}
                            >
                                Hapus
                            </Button>
                        </div>
                    </div>

                    {/* History Pembayaran */}
                    {lang && lang.historyPembayaran.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h3 className="font-semibold text-slate-900 text-sm">History Pembayaran</h3>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Jumlah</TableHead>
                                        <TableHead>Metode</TableHead>
                                        <TableHead>Periode</TableHead>
                                        <TableHead>Dicatat oleh</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lang.historyPembayaran.slice().reverse().map((h, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{formatDate(h.tanggal)}</TableCell>
                                            <TableCell>{formatRupiah(h.jumlah)}</TableCell>
                                            <TableCell className="capitalize">{h.metode}</TableCell>
                                            <TableCell className="text-sm text-slate-500">
                                                {h.periodeMulai && h.periodeSampai
                                                    ? `${formatDate(h.periodeMulai)} – ${formatDate(h.periodeSampai)}`
                                                    : '—'}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500">{h.oleh ?? '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </main>

            {/* Suspend Dialog */}
            <Dialog open={dialog === 'suspend'} onOpenChange={() => setDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Suspend Pelanggan</DialogTitle></DialogHeader>
                    <p className="text-sm text-slate-600">Suspend <strong>{pel.nama}</strong>? Koneksi akan diputus.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
                        <Button
                            className="bg-amber-500 hover:bg-amber-600"
                            onClick={handleSuspend}
                            disabled={suspendMut.isPending}
                        >
                            Suspend
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Aktifkan Dialog */}
            <Dialog open={dialog === 'aktifkan'} onOpenChange={() => setDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Aktifkan Pelanggan</DialogTitle></DialogHeader>
                    <p className="text-sm text-slate-600">Aktifkan kembali koneksi <strong>{pel.nama}</strong>?</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
                        <Button onClick={handleAktifkan} disabled={aktifkanMut.isPending}>Aktifkan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bayar Dialog */}
            <Dialog open={dialog === 'bayar'} onOpenChange={() => setDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Catat Pembayaran</DialogTitle></DialogHeader>
                    <form onSubmit={handleBayar} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>Jumlah (Rp)</Label>
                            <Input
                                {...bayarForm.register('jumlah', { valueAsNumber: true })}
                                type="number"
                                placeholder="150000"
                            />
                            {bayarForm.formState.errors.jumlah && (
                                <p className="text-xs text-red-500">{bayarForm.formState.errors.jumlah.message}</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Metode Pembayaran</Label>
                            <Input {...bayarForm.register('metode')} placeholder="tunai / transfer / qris" />
                            {bayarForm.formState.errors.metode && (
                                <p className="text-xs text-red-500">{bayarForm.formState.errors.metode.message}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialog(null)}>Batal</Button>
                            <Button type="submit" disabled={bayarMut.isPending}>Catat</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Ganti Paket Dialog */}
            <Dialog open={dialog === 'ganti'} onOpenChange={() => setDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Ganti Paket</DialogTitle></DialogHeader>
                    <div className="space-y-1.5">
                        <Label>Pilih Paket</Label>
                        <Select value={gantiPaketId} onValueChange={(v) => setGantiPaketId(v ?? '')}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih paket" />
                            </SelectTrigger>
                            <SelectContent>
                                {paketList.map((p) => (
                                    <SelectItem key={p._id} value={p._id}>
                                        {p.nama} — {formatRupiah(p.hargaBulanan)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
                        <Button onClick={handleGantiPaket} disabled={gantiPaketMut.isPending || !gantiPaketId}>
                            Ganti
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Hapus Dialog */}
            <Dialog open={dialog === 'hapus'} onOpenChange={() => setDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Hapus Pelanggan</DialogTitle></DialogHeader>
                    <p className="text-sm text-slate-600">
                        Hapus <strong>{pel.nama}</strong> secara permanen? Data dan konfigurasi MikroTik akan dihapus.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
                        <Button variant="destructive" onClick={handleHapus} disabled={deleteMut.isPending}>
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Info Dialog */}
            <Dialog open={dialog === 'edit'} onOpenChange={() => setDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Info Pelanggan</DialogTitle></DialogHeader>
                    <form onSubmit={handleEditInfo} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>Nama</Label>
                            <Input {...editInfoForm.register('nama')} />
                            {editInfoForm.formState.errors.nama && (
                                <p className="text-xs text-red-500">{editInfoForm.formState.errors.nama.message}</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label>No. HP</Label>
                            <Input {...editInfoForm.register('noHp')} placeholder="08xxxxxxxxxx" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Alamat</Label>
                            <Input {...editInfoForm.register('alamat')} placeholder="Jl. ..." />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialog(null)}>Batal</Button>
                            <Button type="submit" disabled={updateInfoMut.isPending}>Simpan</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Ganti MAC Dialog */}
            <Dialog open={dialog === 'ganti-mac'} onOpenChange={() => setDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Ganti MAC Address</DialogTitle></DialogHeader>
                    <p className="text-sm text-orange-600 bg-orange-50 rounded-lg p-3">
                        Perhatian: Ganti MAC akan mengupdate DHCP lease di MikroTik. Gunakan MAC address WAN port router pelanggan.
                    </p>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label>MAC Address Baru</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5 h-7 text-xs"
                                onClick={() => setMacDetectOpen((v) => !v)}
                            >
                                <Radar className="w-3.5 h-3.5" />
                                Deteksi perangkat baru
                            </Button>
                        </div>
                        <Input
                            value={newMac}
                            onChange={e => setNewMac(e.target.value)}
                            placeholder="AA:BB:CC:DD:EE:FF"
                            className="font-mono"
                        />
                        {macDetectOpen && (
                            <div className="mt-2 rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                                    <span className="text-xs text-slate-500">
                                        Router baru yang baru tersambung (belum terdaftar)
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1.5 h-6 text-xs"
                                        onClick={() => refetchPerangkat()}
                                        disabled={detecting}
                                    >
                                        <RotateCw className={`w-3 h-3 ${detecting ? 'animate-spin' : ''}`} />
                                        Pindai
                                    </Button>
                                </div>
                                <div className="max-h-48 overflow-auto divide-y divide-slate-100">
                                    {detecting ? (
                                        <div className="py-6 text-center text-sm text-slate-400">
                                            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                            Memindai...
                                        </div>
                                    ) : perangkat && !perangkat.ok ? (
                                        <div className="py-6 text-center text-sm text-red-500">
                                            Gagal baca MikroTik: {perangkat.error ?? 'tidak diketahui'}
                                        </div>
                                    ) : !perangkat || perangkat.rows.length === 0 ? (
                                        <div className="py-6 text-center text-sm text-slate-400">
                                            Tidak ada perangkat baru. Nyalakan router baru lalu klik Pindai.
                                        </div>
                                    ) : (
                                        perangkat.rows.map((d) => (
                                            <button
                                                type="button"
                                                key={`${d.macAddress}-${d.ip}`}
                                                onClick={() => {
                                                    setNewMac(d.macAddress);
                                                    setMacDetectOpen(false);
                                                }}
                                                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between"
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
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
                        <Button
                            onClick={handleGantiMac}
                            disabled={gantiMacMut.isPending || !newMac}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            Ganti MAC
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

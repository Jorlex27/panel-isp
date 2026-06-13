'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    useListPaket,
    useCreatePaket,
    useUpdatePaket,
    useDeletePaket,
} from '@/lib/query/paket.query';
import { formatRupiah } from '@/lib/utils/format';
import type { Paket } from '@/lib/types';

const schema = z.object({
    nama: z.string().min(1),
    hargaBulanan: z.number().min(0),
    speedDown: z.number().min(1),
    speedUp: z.number().min(1),
    durasiHari: z.number().int().min(1).max(366),
});

type FormData = z.infer<typeof schema>;

export default function PaketPage() {
    const { data: paketList = [], isLoading } = useListPaket();
    const createMutation = useCreatePaket();
    const updateMutation = useUpdatePaket();
    const deleteMutation = useDeletePaket();

    const [modal, setModal] = useState<'create' | 'edit' | null>(null);
    const [editTarget, setEditTarget] = useState<Paket | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Paket | null>(null);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const openCreate = () => {
        reset({ nama: '', hargaBulanan: 0, speedDown: 10, speedUp: 10, durasiHari: 30 });
        setModal('create');
    };

    const openEdit = (p: Paket) => {
        setEditTarget(p);
        reset({
            nama: p.nama,
            hargaBulanan: p.hargaBulanan,
            speedDown: p.speedDown,
            speedUp: p.speedUp,
            durasiHari: p.durasiHari ?? 30,
        });
        setModal('edit');
    };

    const onSubmit = handleSubmit(async (data) => {
        try {
            if (modal === 'create') {
                await createMutation.mutateAsync(data);
                toast.success('Paket berhasil ditambahkan');
            } else if (modal === 'edit' && editTarget) {
                await updateMutation.mutateAsync({ id: editTarget._id, input: data });
                toast.success('Paket berhasil diperbarui');
            }
            setModal(null);
        } catch {
            toast.error('Gagal menyimpan paket');
        }
    });

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteMutation.mutateAsync(deleteTarget._id);
            toast.success('Paket dihapus');
            setDeleteTarget(null);
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Gagal menghapus paket';
            toast.error(msg);
        }
    };

    return (
        <>
            <Header title="Paket" />
            <main className="flex-1 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">Daftar Paket</h2>
                    <Button onClick={openCreate} size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Tambah Paket
                    </Button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama</TableHead>
                                <TableHead>Harga</TableHead>
                                <TableHead>Speed Down</TableHead>
                                <TableHead>Speed Up</TableHead>
                                <TableHead>Durasi</TableHead>
                                <TableHead className="w-20">Aksi</TableHead>
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
                            ) : paketList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                        Belum ada paket
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paketList.map((p) => (
                                    <TableRow key={p._id}>
                                        <TableCell className="font-medium">{p.nama}</TableCell>
                                        <TableCell>{formatRupiah(p.hargaBulanan)}</TableCell>
                                        <TableCell>{p.speedDown} Mbps</TableCell>
                                        <TableCell>{p.speedUp} Mbps</TableCell>
                                        <TableCell>{p.durasiHari ?? 30} hari</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => openEdit(p)}
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => setDeleteTarget(p)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </main>

            {/* Form Modal */}
            <Dialog open={modal !== null} onOpenChange={() => setModal(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{modal === 'create' ? 'Tambah Paket' : 'Edit Paket'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>Nama Paket</Label>
                            <Input {...register('nama')} placeholder="Paket Dasar 10 Mbps" />
                            {errors.nama && <p className="text-xs text-red-500">{errors.nama.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Harga Bulanan (Rp)</Label>
                            <Input {...register('hargaBulanan', { valueAsNumber: true })} type="number" placeholder="150000" />
                            {errors.hargaBulanan && <p className="text-xs text-red-500">{errors.hargaBulanan.message}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Speed Down (Mbps)</Label>
                                <Input {...register('speedDown', { valueAsNumber: true })} type="number" placeholder="10" />
                                {errors.speedDown && <p className="text-xs text-red-500">{errors.speedDown.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label>Speed Up (Mbps)</Label>
                                <Input {...register('speedUp', { valueAsNumber: true })} type="number" placeholder="5" />
                                {errors.speedUp && <p className="text-xs text-red-500">{errors.speedUp.message}</p>}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Durasi / Siklus (hari)</Label>
                            <Input {...register('durasiHari', { valueAsNumber: true })} type="number" placeholder="30" />
                            <p className="text-xs text-slate-400">
                                Lama satu periode langganan. Dipakai saat memperpanjang masa aktif ketika pelanggan membayar.
                            </p>
                            {errors.durasiHari && <p className="text-xs text-red-500">{errors.durasiHari.message}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setModal(null)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Paket</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-600">
                        Hapus paket <strong>{deleteTarget?.nama}</strong>? Aksi ini tidak bisa dibatalkan.
                        Akan diblokir jika ada pelanggan aktif.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteMutation.isPending}
                        >
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

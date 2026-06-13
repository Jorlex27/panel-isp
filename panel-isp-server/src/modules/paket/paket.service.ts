import type { ObjectId } from 'mongodb';
import { gantiPaketMikrotik } from '@/services/mikrotik.service';
import { db } from '@shared/utils/db.util';
import { ApiError } from '@shared/errors/api-error';
import { logger } from '@shared/utils/logger.util';
import type { PaketPopulated } from '@shared/types/doc.types';
import { recordAudit } from '@modules/audit/audit.service';
import type { PaketCreateInput, PaketUpdateInput } from './paket.schema';

const col = () => db.getCollection('paket');
const langCol = () => db.getCollection('langganan');
const pelCol = () => db.getCollection('pelanggan');

const paketLookupLangganans = [
    {
        $lookup: {
            from: 'langganan',
            localField: '_id',
            foreignField: 'paketId',
            as: 'langganans',
        },
    },
];

export async function listPaket(): Promise<PaketPopulated[]> {
    const rows = await col()
        .aggregate<PaketPopulated>([{ $sort: { nama: 1 } }, ...paketLookupLangganans])
        .toArray();
    return rows;
}

export async function getPaket(id: ObjectId): Promise<PaketPopulated> {
    const rows = await col()
        .aggregate<PaketPopulated>([{ $match: { _id: id } }, ...paketLookupLangganans])
        .toArray();
    if (!rows[0]) throw ApiError.notFound('Paket tidak ditemukan');
    return rows[0];
}

export async function createPaket(input: PaketCreateInput, actor: string): Promise<PaketPopulated> {
    const now = new Date();
    const doc = { ...input, createdAt: now, updatedAt: now };
    const res = await col().insertOne(doc as never);
    const data = await getPaket(res.insertedId);
    await recordAudit({
        actor,
        action: 'paket.create',
        targetType: 'paket',
        targetId: data._id,
        targetName: data.nama,
        summary: `Membuat paket "${data.nama}" (Rp ${data.hargaBulanan.toLocaleString('id-ID')}, ${data.speedDown}M/${data.speedUp}M)`,
        after: { nama: data.nama, hargaBulanan: data.hargaBulanan, speedDown: data.speedDown, speedUp: data.speedUp },
    });
    return data;
}

async function syncMikrotikSpeedsForPaketSubscribers(
    paketId: ObjectId,
    speedDown: number,
    speedUp: number
): Promise<void> {
    const subs = await langCol()
        .find({ paketId })
        .project({ pelangganId: 1 })
        .toArray();
    for (const row of subs) {
        const pel = await pelCol().findOne({ _id: row.pelangganId });
        if (pel && pel.status === 'aktif') {
            try {
                await gantiPaketMikrotik(pel.nama, `${speedDown}M/${speedUp}M`);
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                logger.warn(`Sinkron speed paket ke MikroTik gagal (${pel.nama}): ${msg}`);
            }
        }
    }
}

export async function updatePaket(
    id: ObjectId,
    input: PaketUpdateInput,
    actor: string
): Promise<PaketPopulated> {
    const before = await getPaket(id);
    const now = new Date();
    const res = await col().updateOne({ _id: id }, { $set: { ...input, updatedAt: now } });
    if (res.matchedCount === 0) throw ApiError.notFound('Paket tidak ditemukan');
    const data = await getPaket(id);
    if (input.speedDown !== undefined || input.speedUp !== undefined) {
        await syncMikrotikSpeedsForPaketSubscribers(id, data.speedDown, data.speedUp);
    }
    await recordAudit({
        actor,
        action: 'paket.update',
        targetType: 'paket',
        targetId: data._id,
        targetName: data.nama,
        summary: `Mengubah paket "${data.nama}"`,
        before: { nama: before.nama, hargaBulanan: before.hargaBulanan, speedDown: before.speedDown, speedUp: before.speedUp },
        after: { nama: data.nama, hargaBulanan: data.hargaBulanan, speedDown: data.speedDown, speedUp: data.speedUp },
    });
    return data;
}

export async function deletePaket(id: ObjectId, actor: string): Promise<void> {
    const paket = await getPaket(id);
    // Cegah hapus paket yang masih dipakai langganan agar tidak ada langganan yatim.
    const dipakai = await langCol().countDocuments({ paketId: id });
    if (dipakai > 0) {
        throw ApiError.badRequest(
            `Paket "${paket.nama}" masih dipakai ${dipakai} langganan. Pindahkan dulu pelanggan ke paket lain.`,
            'PAKET_IN_USE'
        );
    }
    const res = await col().deleteOne({ _id: id });
    if (res.deletedCount === 0) throw ApiError.notFound('Paket tidak ditemukan');
    await recordAudit({
        actor,
        action: 'paket.delete',
        targetType: 'paket',
        targetId: id,
        targetName: paket.nama,
        summary: `Menghapus paket "${paket.nama}"`,
        before: { nama: paket.nama, hargaBulanan: paket.hargaBulanan },
    });
}

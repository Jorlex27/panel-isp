import type { ClientSession, ObjectId } from 'mongodb';
import { db } from '@shared/utils/db.util';
import { ApiError } from '@shared/errors/api-error';
import type { LanggananPopulated, PembayaranItem } from '@shared/types/doc.types';
import * as paketService from '@modules/paket/paket.service';
import { recordAudit } from '@modules/audit/audit.service';

const col = () => db.getCollection('langganan');

const langgananLookupRelations = [
    {
        $lookup: {
            from: 'pelanggan',
            localField: 'pelangganId',
            foreignField: '_id',
            as: 'pelanggan',
        },
    },
    { $unwind: { path: '$pelanggan', preserveNullAndEmptyArrays: true } },
    {
        $lookup: {
            from: 'paket',
            localField: 'paketId',
            foreignField: '_id',
            as: 'paket',
        },
    },
    { $unwind: { path: '$paket', preserveNullAndEmptyArrays: true } },
];

export async function listLangganan(): Promise<LanggananPopulated[]> {
    return col()
        .aggregate<LanggananPopulated>([{ $sort: { tanggalExpire: -1 } }, ...langgananLookupRelations])
        .toArray();
}

export async function getLangganan(id: ObjectId, session?: ClientSession): Promise<LanggananPopulated> {
    const rows = await col()
        .aggregate<LanggananPopulated>([{ $match: { _id: id } }, ...langgananLookupRelations], { session })
        .toArray();
    if (!rows[0]) throw ApiError.notFound('Langganan tidak ditemukan');
    return rows[0];
}

export async function requireByPelangganId(pelangganId: ObjectId): Promise<LanggananPopulated> {
    const rows = await col()
        .aggregate<LanggananPopulated>([{ $match: { pelangganId } }, ...langgananLookupRelations])
        .toArray();
    if (!rows[0]) throw ApiError.notFound('Langganan tidak ditemukan');
    return rows[0];
}

export async function insertLangganan(
    payload: {
        pelangganId: ObjectId;
        paketId: ObjectId;
        tanggalMulai: Date;
        tanggalExpire: Date;
        statusBayar: 'lunas' | 'belum_bayar';
    },
    session?: ClientSession
): Promise<LanggananPopulated> {
    const now = new Date();
    const doc = {
        ...payload,
        historyPembayaran: [] as PembayaranItem[],
        createdAt: now,
        updatedAt: now,
    };
    const res = await col().insertOne(doc as never, { session });
    return getLangganan(res.insertedId, session);
}

export async function createLanggananManual(
    payload: {
        pelangganId: ObjectId;
        paketId: ObjectId;
        tanggalMulai: Date;
        tanggalExpire: Date;
        statusBayar: 'lunas' | 'belum_bayar';
    },
    actor: string
): Promise<LanggananPopulated> {
    const existing = await col().findOne({ pelangganId: payload.pelangganId });
    if (existing) throw ApiError.badRequest('Pelanggan sudah punya langganan', 'LANGGANAN_EXISTS');
    const paket = await paketService.getPaket(payload.paketId);
    const pel = await db.getCollection('pelanggan').findOne({ _id: payload.pelangganId });
    if (!pel) throw ApiError.notFound('Pelanggan tidak ditemukan');
    const created = await insertLangganan(payload);
    await recordAudit({
        actor,
        action: 'langganan.create',
        targetType: 'langganan',
        targetId: created._id,
        targetName: created.pelanggan?.nama,
        summary: `Membuat langganan manual untuk "${created.pelanggan?.nama ?? '—'}" (paket ${paket.nama})`,
        after: { paket: paket.nama, tanggalExpire: payload.tanggalExpire, statusBayar: payload.statusBayar },
    });
    return created;
}

export async function deleteByPelangganId(pelangganId: ObjectId, session?: ClientSession): Promise<void> {
    await col().deleteMany({ pelangganId }, { session });
}

const HARI_MS = 24 * 60 * 60 * 1000;

export async function recordBayar(
    pelangganId: ObjectId,
    jumlah: number,
    metode: string,
    actor: string
): Promise<LanggananPopulated> {
    const existing = await col().findOne({ pelangganId });
    if (!existing) throw ApiError.notFound('Langganan tidak ditemukan');

    // Durasi sesuai paket (default 30 hari bila paket lama belum punya durasiHari).
    const paket = await db.getCollection('paket').findOne({ _id: existing.paketId });
    const durasiHari = typeof paket?.durasiHari === 'number' && paket.durasiHari > 0 ? paket.durasiHari : 30;

    // Perpanjang dari tanggal expire lama bila belum lewat, agar pelanggan tidak
    // kehilangan sisa hari saat bayar lebih awal. Bila sudah lewat, mulai dari sekarang.
    const now = new Date();
    const expireLama =
        existing.tanggalExpire instanceof Date ? existing.tanggalExpire : new Date(existing.tanggalExpire);
    const basis = expireLama > now ? expireLama : now;
    const expireBaru = new Date(basis.getTime() + durasiHari * HARI_MS);

    const entry: PembayaranItem = {
        tanggal: now,
        jumlah,
        metode,
        oleh: actor,
        periodeMulai: basis,
        periodeSampai: expireBaru,
    };

    await col().updateOne(
        { pelangganId },
        {
            $set: {
                tanggalExpire: expireBaru,
                statusBayar: 'lunas',
                updatedAt: now,
            },
            $push: { historyPembayaran: entry },
        }
    );
    return getLangganan(existing._id);
}

export async function updatePaketId(pelangganId: ObjectId, paketId: ObjectId): Promise<void> {
    await col().updateOne(
        { pelangganId },
        { $set: { paketId, updatedAt: new Date() } }
    );
}

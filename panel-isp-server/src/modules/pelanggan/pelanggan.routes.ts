import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { ApiError } from '@shared/errors/api-error';
import { objectIdString } from '@shared/schemas/object-id.schema';
import { bayarBodySchema, gantiMacSchema, gantiPaketBodySchema, pelangganCreateSchema, pelangganUpdateInfoSchema } from './pelanggan.schema';
import * as pelangganService from './pelanggan.service';

function parseObjectId(param: string, label: string): ObjectId {
    const parsed = objectIdString.safeParse(param);
    if (!parsed.success) throw ApiError.badRequest(`${label} tidak valid`, 'INVALID_ID');
    return new ObjectId(parsed.data);
}

export const pelangganRouter = new Hono()
    .get('/', async c => {
        const q = c.req.query();
        const status = q.status === 'aktif' || q.status === 'suspend' ? q.status : undefined;
        const data = await pelangganService.listPelanggan({
            q: q.q || undefined,
            status,
            page: Number(q.page ?? '1'),
            limit: Number(q.limit ?? '25'),
        });
        return c.json({ success: true, data });
    })
    .get('/:id', async c => {
        const id = parseObjectId(c.req.param('id'), 'ID pelanggan');
        const data = await pelangganService.getPelanggan(id);
        return c.json({ success: true, data });
    })
    .post('/', async c => {
        const body = pelangganCreateSchema.parse(await c.req.json());
        const data = await pelangganService.createPelanggan(body, c.get('actor'));
        return c.json({ success: true, data }, 201);
    })
    .patch('/:id/suspend', async c => {
        const id = parseObjectId(c.req.param('id'), 'ID pelanggan');
        const data = await pelangganService.suspendPelangganDb(id, c.get('actor'));
        return c.json({ success: true, data });
    })
    .patch('/:id/aktifkan', async c => {
        const id = parseObjectId(c.req.param('id'), 'ID pelanggan');
        const data = await pelangganService.aktifkanPelangganDb(id, c.get('actor'));
        return c.json({ success: true, data });
    })
    .post('/:id/bayar', async c => {
        const id = parseObjectId(c.req.param('id'), 'ID pelanggan');
        const body = bayarBodySchema.parse(await c.req.json());
        const result = await pelangganService.bayarPelanggan(id, body, c.get('actor'));
        return c.json({ success: true, data: result });
    })
    .patch('/:id/ganti-paket', async c => {
        const id = parseObjectId(c.req.param('id'), 'ID pelanggan');
        const body = gantiPaketBodySchema.parse(await c.req.json());
        const data = await pelangganService.gantiPaket(id, body, c.get('actor'));
        return c.json({ success: true, data });
    })
    .patch('/:id', async c => {
        const id = parseObjectId(c.req.param('id'), 'ID pelanggan');
        const body = pelangganUpdateInfoSchema.parse(await c.req.json());
        const data = await pelangganService.updatePelangganInfo(id, body, c.get('actor'));
        return c.json({ success: true, data });
    })
    .patch('/:id/ganti-mac', async c => {
        const id = parseObjectId(c.req.param('id'), 'ID pelanggan');
        const body = gantiMacSchema.parse(await c.req.json());
        const data = await pelangganService.gantiMacPelanggan(id, body.macAddress, c.get('actor'));
        return c.json({ success: true, data });
    })
    .delete('/:id', async c => {
        const id = parseObjectId(c.req.param('id'), 'ID pelanggan');
        await pelangganService.deletePelangganDb(id, c.get('actor'));
        return c.json({ success: true });
    });

import { Hono } from 'hono';
import * as auditService from './audit.service';

export const auditRouter = new Hono()
    .get('/', async c => {
        const q = c.req.query();
        const data = await auditService.listAudit({
            actor: q.actor || undefined,
            action: q.action || undefined,
            targetType: q.targetType || undefined,
            targetId: q.targetId || undefined,
            q: q.q || undefined,
            dari: q.dari ? new Date(q.dari) : undefined,
            sampai: q.sampai ? new Date(q.sampai) : undefined,
            page: Number(q.page ?? '1'),
            limit: Number(q.limit ?? '25'),
        });
        return c.json({ success: true, data });
    })
    .get('/meta', async c => {
        const data = await auditService.auditMeta();
        return c.json({ success: true, data });
    });

import { Hono } from 'hono';
import * as monitoringService from './monitoring.service';

export const monitoringRouter = new Hono()
    .get('/overview', async c => {
        const data = await monitoringService.getOverview();
        return c.json({ success: true, data });
    })
    .get('/koneksi-pelanggan', async c => {
        const data = await monitoringService.getPelangganKoneksi();
        return c.json({ success: true, data });
    })
    .get('/perangkat-baru', async c => {
        const data = await monitoringService.getPerangkatBaru();
        return c.json({ success: true, data });
    });

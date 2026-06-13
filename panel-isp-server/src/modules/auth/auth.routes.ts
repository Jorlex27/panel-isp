import { Hono } from 'hono';
import { z } from 'zod';
import { rateLimit } from '@/middleware/rate-limit.middleware';
import * as authService from './auth.service';

const loginSchema = z.object({
    username: z.string().min(1).max(64).regex(/^[A-Za-z0-9_.-]+$/, 'Username tidak valid'),
    password: z.string().min(1).max(128),
});

const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Terlalu banyak percobaan login. Coba lagi nanti.',
});

export const authRouter = new Hono().post('/login', loginRateLimit, async c => {
    const body = loginSchema.parse(await c.req.json());
    const data = await authService.login(body.username, body.password);
    return c.json({ success: true, data });
});

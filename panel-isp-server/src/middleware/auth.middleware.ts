import jwt from 'jsonwebtoken';
import { createMiddleware } from 'hono/factory';
import { ApiError } from '@shared/errors/api-error';
import { getJwtSecret } from '@config/index';

export const authMiddleware = createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw new ApiError('Token tidak ditemukan', 401, 'UNAUTHORIZED');
    }
    const token = authHeader.slice(7);
    let payload: jwt.JwtPayload | string;
    try {
        payload = jwt.verify(token, getJwtSecret());
    } catch {
        throw new ApiError('Token tidak valid atau sudah expired', 401, 'UNAUTHORIZED');
    }
    const actor =
        typeof payload === 'object' && payload !== null && typeof payload.sub === 'string'
            ? payload.sub
            : 'unknown';
    c.set('actor', actor);
    await next();
});

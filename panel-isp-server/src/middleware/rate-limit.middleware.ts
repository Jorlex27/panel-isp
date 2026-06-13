import { createMiddleware } from 'hono/factory';
import { ApiError } from '@shared/errors/api-error';

interface Bucket {
    count: number;
    resetAt: number;
}

/**
 * Rate limiter sederhana berbasis memori (cukup untuk deployment single-instance).
 * Membatasi jumlah percobaan per kunci (mis. IP) dalam jendela waktu tertentu.
 */
export function rateLimit(options: { windowMs: number; max: number; message?: string }) {
    const { windowMs, max, message } = options;
    const buckets = new Map<string, Bucket>();

    return createMiddleware(async (c, next) => {
        const ip =
            c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
            c.req.header('x-real-ip') ||
            'unknown';
        const now = Date.now();
        const bucket = buckets.get(ip);

        if (!bucket || now > bucket.resetAt) {
            buckets.set(ip, { count: 1, resetAt: now + windowMs });
        } else {
            bucket.count += 1;
            if (bucket.count > max) {
                const sisaDetik = Math.ceil((bucket.resetAt - now) / 1000);
                c.header('Retry-After', String(sisaDetik));
                throw new ApiError(
                    message ?? `Terlalu banyak percobaan. Coba lagi dalam ${sisaDetik} detik.`,
                    429,
                    'RATE_LIMITED'
                );
            }
        }

        // Bersihkan bucket yang sudah kedaluwarsa agar memori tidak menumpuk.
        if (buckets.size > 5000) {
            for (const [key, b] of buckets) {
                if (now > b.resetAt) buckets.delete(key);
            }
        }

        await next();
    });
}

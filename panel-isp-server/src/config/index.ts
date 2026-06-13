export const isDev = (process.env.NODE_ENV_CONFIG ?? 'development') !== 'production';

/**
 * Ambil JWT secret. Fail-fast bila kosong/terlalu pendek agar token tidak
 * pernah ditandatangani/diverifikasi memakai secret kosong (celah keamanan).
 */
export function getJwtSecret(): string {
    const secret = (process.env.JWT_SECRET ?? '').trim();
    if (secret.length < 16) {
        throw new Error(
            'JWT_SECRET belum di-set atau terlalu pendek (min 16 karakter). Set di .env sebelum menjalankan server.'
        );
    }
    return secret;
}

/**
 * Daftar origin yang diizinkan untuk CORS. Default '*' (kompatibel dengan
 * setup lama yang memakai Bearer token, bukan cookie). Set CORS_ORIGIN di .env
 * (pisahkan dengan koma) untuk membatasi ke origin web saja.
 */
export function getCorsOrigins(): string | string[] {
    const raw = (process.env.CORS_ORIGIN ?? '').trim();
    if (!raw || raw === '*') return '*';
    return raw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
}

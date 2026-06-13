import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { ApiError } from '@shared/errors/api-error';
import { db } from '@shared/utils/db.util';
import { getJwtSecret } from '@config/index';
import { recordAudit } from '@modules/audit/audit.service';

// Hash dummy untuk menyamakan waktu bcrypt saat user tidak ditemukan
// (cegah username enumeration via timing). Dibuat sekali saat modul dimuat.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

// Lockout per-username: spoofing IP tidak bisa mereset counter akun.
const MAX_FAILS = 10;
const LOCK_MS = 15 * 60 * 1000;
const fails = new Map<string, { count: number; resetAt: number }>();

function recordFail(username: string): void {
    const now = Date.now();
    const e = fails.get(username);
    if (!e || now > e.resetAt) {
        fails.set(username, { count: 1, resetAt: now + LOCK_MS });
    } else {
        e.count += 1;
    }
}

function lockRemainingMs(username: string): number {
    const e = fails.get(username);
    if (!e || Date.now() > e.resetAt || e.count < MAX_FAILS) return 0;
    return e.resetAt - Date.now();
}

/** Bersihkan username untuk audit: buang karakter kontrol & batasi panjang 64. */
function safeUsername(u: string): string {
    let out = '';
    for (const ch of u) {
        const code = ch.charCodeAt(0);
        if (code >= 32 && code !== 127) out += ch;
        if (out.length >= 64) break;
    }
    return out;
}

export async function login(
    username: string,
    password: string
): Promise<{ token: string; expiresAt: Date }> {
    const secret = getJwtSecret();
    const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];
    const safeName = safeUsername(username);

    const remaining = lockRemainingMs(username);
    if (remaining > 0) {
        throw new ApiError(
            `Akun terkunci sementara karena terlalu banyak gagal login. Coba lagi dalam ${Math.ceil(remaining / 60000)} menit.`,
            429,
            'ACCOUNT_LOCKED'
        );
    }

    const admin = await db.getCollection('admin').findOne({ username });
    if (!admin) {
        // Tetap jalankan compare agar waktu sama dengan jalur user-ada.
        await bcrypt.compare(password, DUMMY_HASH);
        recordFail(username);
        await recordAudit({
            actor: safeName || 'unknown',
            action: 'auth.login_gagal',
            targetType: 'auth',
            summary: 'Login gagal (username tidak ditemukan)',
            meta: { username: safeName },
            result: 'error',
        });
        throw new ApiError('Username atau password salah', 401, 'INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
        recordFail(username);
        await recordAudit({
            actor: safeName,
            action: 'auth.login_gagal',
            targetType: 'auth',
            summary: 'Login gagal (password salah)',
            meta: { username: safeName },
            result: 'error',
        });
        throw new ApiError('Username atau password salah', 401, 'INVALID_CREDENTIALS');
    }

    fails.delete(username);

    const token = jwt.sign({ sub: username }, secret, { expiresIn });
    const decoded = jwt.decode(token) as { exp: number } | null;
    const expiresAt = decoded ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await recordAudit({
        actor: safeName,
        action: 'auth.login',
        targetType: 'auth',
        summary: `Login berhasil sebagai "${safeName}"`,
    });

    return { token, expiresAt };
}

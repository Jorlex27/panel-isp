import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { ApiError } from '@shared/errors/api-error';
import { db } from '@shared/utils/db.util';
import { getJwtSecret } from '@config/index';
import { recordAudit } from '@modules/audit/audit.service';

export async function login(
    username: string,
    password: string
): Promise<{ token: string; expiresAt: Date }> {
    const secret = getJwtSecret();
    const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];

    const admin = await db.getCollection('admin').findOne({ username });
    if (!admin) {
        await recordAudit({
            actor: username || 'unknown',
            action: 'auth.login_gagal',
            targetType: 'auth',
            summary: `Login gagal untuk username "${username}" (tidak ditemukan)`,
            result: 'error',
        });
        throw new ApiError('Username atau password salah', 401, 'INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
        await recordAudit({
            actor: username,
            action: 'auth.login_gagal',
            targetType: 'auth',
            summary: `Login gagal untuk username "${username}" (password salah)`,
            result: 'error',
        });
        throw new ApiError('Username atau password salah', 401, 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign({ sub: username }, secret, { expiresIn });
    const decoded = jwt.decode(token) as { exp: number } | null;
    const expiresAt = decoded ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await recordAudit({
        actor: username,
        action: 'auth.login',
        targetType: 'auth',
        summary: `Login berhasil sebagai "${username}"`,
    });

    return { token, expiresAt };
}

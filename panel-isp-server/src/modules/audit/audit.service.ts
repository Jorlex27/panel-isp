import { ObjectId, type Filter } from 'mongodb';
import { db } from '@shared/utils/db.util';
import { logger } from '@shared/utils/logger.util';
import type { AuditLogDoc, AuditResult, AuditTargetType } from '@shared/types/doc.types';

const col = () => db.getCollection('audit_log');

export interface RecordAuditInput {
    actor: string;
    action: string;
    targetType?: AuditTargetType;
    targetId?: ObjectId;
    targetName?: string;
    summary: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    meta?: Record<string, unknown>;
    result?: AuditResult;
    error?: string;
}

/**
 * Tulis satu baris audit. Best-effort: kegagalan menulis audit TIDAK boleh
 * menggagalkan operasi utama, jadi error hanya di-log sebagai warning.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
    try {
        const doc: Omit<AuditLogDoc, '_id'> = {
            actor: input.actor || 'unknown',
            action: input.action,
            targetType: input.targetType,
            targetId: input.targetId,
            targetName: input.targetName,
            summary: input.summary,
            before: input.before,
            after: input.after,
            meta: input.meta,
            result: input.result ?? 'success',
            error: input.error,
            createdAt: new Date(),
        };
        await col().insertOne(doc as never);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.warn(`Audit log gagal ditulis (${input.action}): ${msg}`);
    }
}

export interface ListAuditFilter {
    actor?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    q?: string;
    dari?: Date;
    sampai?: Date;
    page: number;
    limit: number;
}

export interface ListAuditResult {
    rows: AuditLogDoc[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listAudit(filter: ListAuditFilter): Promise<ListAuditResult> {
    const query: Filter<AuditLogDoc> = {};
    if (filter.actor) query.actor = filter.actor;
    if (filter.action) query.action = filter.action;
    if (filter.targetType) query.targetType = filter.targetType as AuditTargetType;
    if (filter.targetId && ObjectId.isValid(filter.targetId)) {
        query.targetId = new ObjectId(filter.targetId);
    }
    if (filter.dari || filter.sampai) {
        const range: { $gte?: Date; $lte?: Date } = {};
        if (filter.dari) range.$gte = filter.dari;
        if (filter.sampai) range.$lte = filter.sampai;
        query.createdAt = range;
    }
    if (filter.q) {
        const rx = new RegExp(escapeRegex(filter.q), 'i');
        query.$or = [{ summary: rx }, { targetName: rx }, { actor: rx }];
    }

    const page = Math.max(1, Math.floor(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Math.floor(filter.limit) || 25));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
        col().find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        col().countDocuments(query),
    ]);

    return {
        rows: rows as AuditLogDoc[],
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
    };
}

export async function auditMeta(): Promise<{ actors: string[]; actions: string[] }> {
    const [actors, actions] = await Promise.all([
        col().distinct('actor'),
        col().distinct('action'),
    ]);
    return {
        actors: (actors as string[]).filter(Boolean).sort(),
        actions: (actions as string[]).filter(Boolean).sort(),
    };
}

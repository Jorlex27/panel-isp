import { MongoClient, type ClientSession, type Collection, type Db } from 'mongodb';
import { dbConfig } from '@config/db.config';
import { ApiError } from '@shared/errors/api-error';
import type { AdminDoc, AuditLogDoc, LanggananDoc, PaketDoc, PelangganDoc } from '@shared/types/doc.types';

interface CollectionsByName {
    pelanggan: PelangganDoc;
    paket: PaketDoc;
    langganan: LanggananDoc;
    admin: AdminDoc;
    audit_log: AuditLogDoc;
}

class Database {
    private static instance: Database;
    private client: MongoClient | null = null;
    private database: Db | null = null;

    private constructor() {}

    static getInstance(): Database {
        if (!Database.instance) Database.instance = new Database();
        return Database.instance;
    }

    async connect(): Promise<void> {
        const env = process.env.NODE_ENV_CONFIG ?? 'development';
        const key = env === 'test' ? 'test' : env === 'production' ? 'production' : 'development';
        const config = dbConfig[key];

        if (!this.client) {
            this.client = new MongoClient(config.url, config.options);
            await this.client.connect();
            this.database = this.client.db(config.name);
        }
    }

    getDb(): Db {
        if (!this.database) {
            throw new ApiError('Database belum diinisialisasi', 500, 'DB_NOT_READY');
        }
        return this.database;
    }

    getCollection<N extends keyof CollectionsByName>(name: N): Collection<CollectionsByName[N]> {
        return this.getDb().collection<CollectionsByName[N]>(name);
    }

    async ensureIndexes(): Promise<void> {
        const pelanggan = this.getCollection('pelanggan');
        await pelanggan.createIndex({ ipAddress: 1 }, { unique: true });
        await pelanggan.createIndex({ macAddress: 1 }, { unique: true });
        await pelanggan.createIndex({ nama: 1 });

        const langganan = this.getCollection('langganan');
        await langganan.createIndex({ tanggalExpire: 1 });

        // Audit log: dipakai untuk filter & urut terbaru.
        const audit = this.getCollection('audit_log');
        await audit.createIndex({ createdAt: -1 });
        await audit.createIndex({ actor: 1, createdAt: -1 });
        await audit.createIndex({ action: 1, createdAt: -1 });
        await audit.createIndex({ targetType: 1, targetId: 1, createdAt: -1 });

        // Satu pelanggan = satu langganan (1:1). Index unik ini bisa gagal bila data
        // lama sudah punya duplikat — jangan sampai menggagalkan startup, cukup warning.
        try {
            await langganan.createIndex({ pelangganId: 1 }, { unique: true });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(
                `Index unik langganan.pelangganId gagal dibuat (kemungkinan ada duplikat data lama): ${msg}`
            );
        }
    }

    async withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
        const session = this.getClient().startSession();
        try {
            let result!: T;
            await session.withTransaction(async () => {
                result = await fn(session);
            });
            return result;
        } finally {
            await session.endSession();
        }
    }

    private getClient(): MongoClient {
        if (!this.client) throw new ApiError('Database belum diinisialisasi', 500, 'DB_NOT_READY');
        return this.client;
    }

    isConnected(): boolean {
        return this.database !== null && this.client !== null;
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.database = null;
        }
    }
}

export const db = Database.getInstance();

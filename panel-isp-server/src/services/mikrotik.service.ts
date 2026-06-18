import { createMikrotikClient, type MikrotikRestClient, type RosRow } from '@shared/utils/mikrotik-rest.util';
import { logger } from '@shared/utils/logger.util';

function rosStr(row: RosRow, key: string): string | undefined {
    const v = row[key];
    return typeof v === 'string' ? v : undefined;
}

export function normalizeMac(mac: string): string {
    return mac
        .trim()
        .replace(/-/g, ':')
        .split(':')
        .map(part => part.toUpperCase())
        .join(':');
}

async function withMt<T>(fn: (client: MikrotikRestClient) => Promise<T>): Promise<T> {
    const client = createMikrotikClient();
    await client.ping();
    return fn(client);
}

async function addToAddressList(client: MikrotikRestClient, ip: string): Promise<void> {
    const existing = await client.print('ip/firewall/address-list', {
        list: 'pelanggan-aktif',
        address: ip,
    });
    if (existing.length === 0) {
        await client.add('ip/firewall/address-list', {
            list: 'pelanggan-aktif',
            address: ip,
        });
    }
}

async function clearLeaseByMac(client: MikrotikRestClient, mac: string): Promise<void> {
    const leases = await client.print('ip/dhcp-server/lease', { 'mac-address': mac });
    for (const lease of leases) {
        const lid = rosStr(lease, '.id');
        if (lid) await client.remove('ip/dhcp-server/lease', lid);
    }
}

async function removeFromAddressList(client: MikrotikRestClient, ip: string): Promise<void> {
    const res = await client.print('ip/firewall/address-list', {
        list: 'pelanggan-aktif',
        address: ip,
    });
    const id = res[0] ? rosStr(res[0], '.id') : undefined;
    if (id) await client.remove('ip/firewall/address-list', id);
}

function pelangganWanIface(): string {
    return process.env.MIKROTIK_PELANGGAN_INTERFACE ?? 'ether4';
}

async function simpleQueueIdForPelanggan(
    client: MikrotikRestClient,
    ip: string,
    nama?: string
): Promise<string | undefined> {
    if (nama) {
        const byName = await client.print('queue/simple', { name: nama });
        const nid = byName[0] ? rosStr(byName[0], '.id') : undefined;
        if (nid) return nid;
    }
    for (const target of [`${ip}/32`, ip]) {
        const rows = await client.print('queue/simple', { target });
        const id = rows[0] ? rosStr(rows[0], '.id') : undefined;
        if (id) return id;
    }
    return undefined;
}

export async function setupAwal(): Promise<void> {
    await withMt(async client => {
        const pelIface = pelangganWanIface();
        const eth2 = await client.print('ip/address', { interface: 'ether2' });
        if (eth2.length === 0) {
            await client.add('ip/address', {
                address: '192.168.88.1/24',
                interface: 'ether2',
            });
        }

        const pelIfAddr = await client.print('ip/address', { interface: pelIface });
        if (pelIfAddr.length === 0) {
            await client.add('ip/address', {
                address: '10.10.0.1/24',
                interface: pelIface,
            });
        }

        // Pool DHCP dinamis dipisah dari rentang alokasi statis (IP_POOL_START..END)
        // agar perangkat baru/belum terdaftar tidak bentrok dengan IP pelanggan tetap.
        // Dinamis = (IP_POOL_END + 1) .. 254.
        const poolPrefix = (process.env.IP_POOL_NETWORK ?? '10.10.0.0').split('.').slice(0, 3).join('.');
        const staticEnd = Number(process.env.IP_POOL_END ?? '200');
        const dynStart = staticEnd >= 1 && staticEnd < 254 ? staticEnd + 1 : 201;
        const dynRange = `${poolPrefix}.${dynStart}-${poolPrefix}.254`;

        const pool = await client.print('ip/pool', { name: 'pool-pelanggan' });
        if (pool.length === 0) {
            await client.add('ip/pool', {
                name: 'pool-pelanggan',
                ranges: dynRange,
            });
        }

        const dhcp = await client.print('ip/dhcp-server', { interface: pelIface });
        if (dhcp.length === 0) {
            await client.add('ip/dhcp-server', {
                name: 'dhcp-pelanggan',
                interface: pelIface,
                'address-pool': 'pool-pelanggan',
                disabled: 'no',
            });
            await client.add('ip/dhcp-server/network', {
                address: '10.10.0.0/24',
                gateway: '10.10.0.1',
                'dns-server': '8.8.8.8,8.8.4.4',
            });
        }

        const nat = await client.print('ip/firewall/nat', { comment: 'nat-internet' });
        if (nat.length === 0) {
            await client.add('ip/firewall/nat', {
                chain: 'srcnat',
                'out-interface': 'ether1',
                action: 'masquerade',
                comment: 'nat-internet',
            });
        }

        const fwAllow = await client.print('ip/firewall/filter', { comment: 'izin-pelanggan-aktif' });
        if (fwAllow.length === 0) {
            await client.add('ip/firewall/filter', {
                chain: 'forward',
                'in-interface': pelIface,
                'src-address-list': 'pelanggan-aktif',
                action: 'accept',
                comment: 'izin-pelanggan-aktif',
            });
        }

        const fwDrop = await client.print('ip/firewall/filter', { comment: 'blokir-pelanggan-nonaktif' });
        if (fwDrop.length === 0) {
            await client.add('ip/firewall/filter', {
                chain: 'forward',
                'in-interface': pelIface,
                action: 'drop',
                comment: 'blokir-pelanggan-nonaktif',
            });
        }

        logger.info('setupAwal: konfigurasi MikroTik selesai');
    });
}

export async function tambahPelanggan(
    ip: string,
    mac: string,
    speedDown: number,
    speedUp: number,
    nama: string
): Promise<void> {
    const leaseMac = normalizeMac(mac);
    await withMt(async client => {
        await clearLeaseByMac(client, leaseMac);
        await client.add('ip/dhcp-server/lease', {
            address: ip,
            'mac-address': leaseMac,
            comment: nama,
        });
        await client.add('queue/simple', {
            name: nama,
            target: ip,
            'max-limit': `${speedDown}M/${speedUp}M`,
        });
        await addToAddressList(client, ip);
    });
}

export async function suspendPelanggan(ip: string, _nama?: string): Promise<void> {
    // Suspend = blok total: cukup keluarkan IP dari address-list 'pelanggan-aktif'
    // sehingga firewall men-drop semua traffic-nya. Queue tidak perlu di-throttle
    // karena traffic memang sudah tidak lewat.
    await withMt(async client => {
        await removeFromAddressList(client, ip);
    });
}

export async function aktifkanPelanggan(
    ip: string,
    speedDown: number,
    speedUp: number,
    nama: string
): Promise<void> {
    const maxLimit = `${speedDown}M/${speedUp}M`;
    await withMt(async client => {
        let id = await simpleQueueIdForPelanggan(client, ip, nama);
        if (!id) {
            const created = await client.add('queue/simple', {
                name: nama,
                target: ip,
                'max-limit': maxLimit,
            });
            id = rosStr(created, '.id');
        } else {
            await client.set('queue/simple', id, { 'max-limit': maxLimit });
        }
        await addToAddressList(client, ip);
    });
}

export async function hapusPelanggan(ip: string, nama: string): Promise<void> {
    await withMt(async client => {
        const queue = await client.print('queue/simple', { name: nama });
        let qid = queue[0] ? rosStr(queue[0], '.id') : undefined;
        if (!qid) {
            qid = await simpleQueueIdForPelanggan(client, ip, nama);
        }
        if (qid) await client.remove('queue/simple', qid);

        const lease = await client.print('ip/dhcp-server/lease', { address: ip });
        const lid = lease[0] ? rosStr(lease[0], '.id') : undefined;
        if (lid) await client.remove('ip/dhcp-server/lease', lid);

        await removeFromAddressList(client, ip);
    });
}

export async function gantiPaketMikrotik(nama: string, maxLimit: string): Promise<void> {
    await withMt(async client => {
        const res = await client.print('queue/simple', { name: nama });
        const id = res[0] ? rosStr(res[0], '.id') : undefined;
        if (id) {
            await client.set('queue/simple', id, { 'max-limit': maxLimit });
        } else {
            logger.warn(`gantiPaketMikrotik: queue '${nama}' tidak ditemukan di MikroTik`);
        }
    });
}

export async function renameSimpleQueue(namaLama: string, namaBaru: string): Promise<void> {
    if (namaLama === namaBaru) return;
    await withMt(async client => {
        const res = await client.print('queue/simple', { name: namaLama });
        const id = res[0] ? rosStr(res[0], '.id') : undefined;
        if (id) {
            await client.set('queue/simple', id, { name: namaBaru });
        }
    });
}

export async function gantiMacMikrotik(ip: string, newMac: string): Promise<void> {
    const normalizedMac = normalizeMac(newMac);
    await withMt(async client => {
        await clearLeaseByMac(client, normalizedMac);
        const res = await client.print('ip/dhcp-server/lease', { address: ip });
        const id = res[0] ? rosStr(res[0], '.id') : undefined;
        if (id) {
            await client.set('ip/dhcp-server/lease', id, { 'mac-address': normalizedMac });
        }
    });
}

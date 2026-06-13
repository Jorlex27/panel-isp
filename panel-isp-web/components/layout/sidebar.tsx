'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Package, FileText, Wifi, Activity, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pelanggan', label: 'Pelanggan', icon: Users },
    { href: '/paket', label: 'Paket', icon: Package },
    { href: '/langganan', label: 'Langganan', icon: FileText },
    { href: '/monitoring', label: 'Monitoring', icon: Activity },
    { href: '/audit', label: 'Riwayat Aktivitas', icon: History },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-60 min-h-screen bg-slate-900 flex flex-col">
            <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                    <Wifi className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-semibold text-sm">Panel ISP</span>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-0.5">
                {nav.map(({ href, label, icon: Icon }) => {
                    const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                                active
                                    ? 'bg-white/10 text-white font-medium'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            )}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            {label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}

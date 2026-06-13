'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authStorage } from '@/lib/storage/auth-storage';

interface HeaderProps {
    title: string;
}

export function Header({ title }: HeaderProps) {
    const router = useRouter();

    const logout = () => {
        authStorage.clearToken();
        router.replace('/login');
    };

    return (
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
            <h1 className="font-semibold text-slate-900">{title}</h1>
            <Button variant="ghost" size="sm" onClick={logout} className="text-slate-500 gap-2">
                <LogOut className="w-4 h-4" />
                Keluar
            </Button>
        </header>
    );
}

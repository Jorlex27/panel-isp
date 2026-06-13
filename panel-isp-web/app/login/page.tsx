'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/api/auth.api';
import { authStorage } from '@/lib/storage/auth-storage';

const schema = z.object({
    username: z.string().min(1, 'Username wajib diisi'),
    password: z.string().min(1, 'Password wajib diisi'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
    const router = useRouter();
    const [showPass, setShowPass] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const onSubmit = async (data: FormData) => {
        try {
            const res = await login(data);
            authStorage.saveToken(res.token);
            router.replace('/');
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Login gagal';
            toast.error(msg);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-4">
                        <Wifi className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-semibold text-slate-900">Panel ISP</h1>
                    <p className="text-sm text-slate-500 mt-1">Masuk ke akun administrator</p>
                </div>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm"
                >
                    <div className="space-y-1.5">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            {...register('username')}
                            placeholder="admin"
                            autoComplete="username"
                        />
                        {errors.username && (
                            <p className="text-xs text-red-500">{errors.username.message}</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                {...register('password')}
                                type={showPass ? 'text' : 'password'}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-xs text-red-500">{errors.password.message}</p>
                        )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Memproses...' : 'Masuk'}
                    </Button>
                </form>
            </div>
        </div>
    );
}

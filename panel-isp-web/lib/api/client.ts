import axios, { type InternalAxiosRequestConfig } from 'axios';
import { authStorage } from '@/lib/storage/auth-storage';

const apiClient = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/v1`,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = authStorage.getToken();
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => {
        const payload = response.data as { success?: boolean; data?: unknown };
        if (payload?.success === true && payload.data !== undefined) {
            return { ...response, data: payload.data };
        }
        return response;
    },
    (error) => {
        const status = error.response?.status;
        const url: string = error.config?.url ?? '';
        const isLoginRequest = url.includes('/auth/login');
        // Hanya tendang ke /login bila token (kedaluwarsa/invalid) ditolak di halaman
        // terproteksi — JANGAN untuk request login itu sendiri (biar error tampil di form),
        // dan jangan kalau sudah di /login (cegah reload berulang / loop).
        if (status === 401 && !isLoginRequest && typeof window !== 'undefined') {
            authStorage.clearToken();
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;

import Cookies from 'js-cookie';

const TOKEN_KEY = 'isp_token';

export const authStorage = {
    getToken(): string | undefined {
        return Cookies.get(TOKEN_KEY);
    },
    saveToken(token: string): void {
        // `secure` hanya saat HTTPS; di localhost (http) cookie secure tak akan tersimpan.
        const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
        Cookies.set(TOKEN_KEY, token, {
            expires: 7,
            sameSite: 'Lax',
            secure: isHttps,
        });
    },
    clearToken(): void {
        Cookies.remove(TOKEN_KEY);
    },
};

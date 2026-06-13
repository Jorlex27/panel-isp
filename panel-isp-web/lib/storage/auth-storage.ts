import Cookies from 'js-cookie';

const TOKEN_KEY = 'isp_token';

export const authStorage = {
    getToken(): string | undefined {
        return Cookies.get(TOKEN_KEY);
    },
    saveToken(token: string): void {
        Cookies.set(TOKEN_KEY, token, {
            expires: 7,
            sameSite: 'Lax',
        });
    },
    clearToken(): void {
        Cookies.remove(TOKEN_KEY);
    },
};

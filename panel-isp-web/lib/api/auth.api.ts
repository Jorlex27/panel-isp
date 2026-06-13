import apiClient from './client';

export interface LoginInput {
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    expiresAt: string;
}

export async function login(input: LoginInput): Promise<LoginResponse> {
    const res = await apiClient.post<LoginResponse>('/auth/login', input);
    return res.data;
}

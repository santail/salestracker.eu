import { api } from './api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<void> {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    const { access_token } = response.data;
    localStorage.setItem('token', access_token);
  },

  logout(): void {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },
}; 
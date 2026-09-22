import { api } from './client';
import type { User } from '../types';

interface TokenResponse {
  access_token: string;
  user: User;
}

export const apiLogin = (email: string, password: string) =>
  api.post<TokenResponse>('/api/auth/login', { email, password }).then((r) => r.data);

export const apiRegister = (params: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_number?: string;
}) => api.post<TokenResponse>('/api/auth/register', params).then((r) => r.data);

export const apiPhoneCheck = (country_code: string, phone_number: string) =>
  api
    .post<{ verification_status: string }>('/api/auth/phone-check', {
      country_code,
      phone_number,
    })
    .then((r) => r.data);

export const apiPhoneLogin = (country_code: string, phone_number: string, code: string) =>
  api
    .post<TokenResponse | { verification_status: string }>('/api/auth/phone-login', {
      country_code,
      phone_number,
      code,
    })
    .then((r) => r.data);

export const apiLogout = () => api.post('/api/auth/logout').then((r) => r.data);

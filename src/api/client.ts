import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { env } from '../config/env';

const TOKEN_KEY = 'surf_club_atx_token';

export const tokenStore = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

export const api = axios.create({
  baseURL: env.apiUrl,
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type ApiError = { status?: number; message: string };

export const toApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ??
      error.message;
    return { status: error.response?.status, message };
  }
  return { message: 'Something went wrong. Please try again.' };
};

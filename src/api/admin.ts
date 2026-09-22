import { api } from './client';
import type { AppSetting, User } from '../types';

export const apiAdminListUsers = () => api.get<User[]>('/api/admin/users').then((r) => r.data);

export const apiAdminDeleteUser = (userId: number) =>
  api.delete(`/api/admin/users/${userId}`).then((r) => r.data);

export const apiAdminSendMassPush = (message: string) =>
  api.post('/api/admin/send-mass-push-notification', { message }).then((r) => r.data);

export const apiAdminGetSettings = () =>
  api.get<AppSetting[]>('/api/admin/settings').then((r) => r.data);

export const apiAdminUpdateSetting = (key: string, value: string) =>
  api.post('/api/admin/settings', { key, value }).then((r) => r.data);

import { api } from './client';
import type { AppSetting, SurfEvent, User } from '../types';

export const apiAdminListUsers = () => api.get<User[]>('/api/admin/users').then((r) => r.data);

export const apiAdminDeleteUser = (userId: number) =>
  api.delete(`/api/admin/users/${userId}`).then((r) => r.data);

export const apiAdminListEvents = () => api.get<SurfEvent[]>('/api/admin/events').then((r) => r.data);

export const apiAdminDeleteEvent = (eventId: number) =>
  api.delete(`/api/admin/events/${eventId}`).then((r) => r.data);

// start_time is the outing's local clock time, formatted 'YYYY-MM-DD HH:mm:ss' like Edit Outing sends it.
export const apiAdminUpdateEventDate = (eventId: number, start_time: string) =>
  api.patch<SurfEvent>(`/api/admin/events/${eventId}/date`, { start_time }).then((r) => r.data);

export const apiAdminTakeEventOwnership = (eventId: number) =>
  api.post<SurfEvent>(`/api/admin/events/${eventId}/take-ownership`).then((r) => r.data);

export const apiAdminSendMassPush = (message: string) =>
  api.post('/api/admin/send-mass-push-notification', { message }).then((r) => r.data);

export const apiAdminGetSettings = () =>
  api.get<AppSetting[]>('/api/admin/settings').then((r) => r.data);

export const apiAdminUpdateSetting = (key: string, value: string) =>
  api.post('/api/admin/settings', { key, value }).then((r) => r.data);

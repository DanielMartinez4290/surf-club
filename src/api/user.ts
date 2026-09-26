import { api } from './client';
import type { PublicUser, User } from '../types';

export const apiGetMe = () => api.post<User>('/api/user/get-user-data').then((r) => r.data);

export const apiGetPublicProfile = (userId: number) =>
  api.get<PublicUser>(`/api/user/${userId}`).then((r) => r.data);

export const apiUpdateProfile = (params: Partial<User>) =>
  api.put<User>('/api/user/update', params).then((r) => r.data);

export const apiUpdatePassword = (current_password: string, password: string) =>
  api.post('/api/user/update-password', { current_password, password }).then((r) => r.data);

export const apiDeleteAccount = () => api.delete('/api/user/delete').then((r) => r.data);

export const apiUploadImage = async (uri: string, slot: number) => {
  const form = new FormData();
  const filename = uri.split('/').pop() ?? `photo-${slot}.jpg`;
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  // React Native's fetch/FormData accepts { uri, name, type } for file parts.
  form.append('image', { uri, name: filename, type } as unknown as Blob);
  form.append('slot', String(slot));

  return api
    .post<User>('/api/user/images', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const apiRegisterPushToken = (expo_push_token: string) =>
  api.post('/api/user/push-token', { expo_push_token }).then((r) => r.data);

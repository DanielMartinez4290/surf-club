import { api } from './client';
import type { EventSignup, SurfEvent } from '../types';

export const apiUploadEventPhoto = async (uri: string) => {
  const form = new FormData();
  const filename = uri.split('/').pop() ?? 'event-photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  form.append('image', { uri, name: filename, type } as unknown as Blob);

  return api
    .post<{ url: string }>('/api/events/upload-photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const apiGetEvents = () => api.get<SurfEvent[]>('/api/events').then((r) => r.data);

export const apiGetEvent = (id: number) =>
  api.get<SurfEvent>(`/api/events/${id}`).then((r) => r.data);

export interface CreateEventParams {
  title: string;
  description: string;
  event_type: string;
  location: string;
  picture_url: string | null;
  start_time: string;
  end_time: string | null;
  number_of_spots: number;
  price: number;
}

export const apiCreateEvent = (params: CreateEventParams) =>
  api.post<SurfEvent>('/api/events', params).then((r) => r.data);

export const apiUpdateEvent = (id: number, params: Partial<CreateEventParams>) =>
  api.put<SurfEvent>(`/api/events/${id}`, params).then((r) => r.data);

export const apiDeleteEvent = (id: number) => api.delete(`/api/events/${id}`).then((r) => r.data);

export const apiGetEventSignups = (eventId: number) =>
  api.get<EventSignup[]>(`/api/event-signup/${eventId}`).then((r) => r.data);

export const apiCreateSignup = (event_id: number, payment_intent_id?: string) =>
  api.post<EventSignup>('/api/event-signup', { event_id, payment_intent_id }).then((r) => r.data);

export const apiCancelSignup = (signupId: number) =>
  api.delete(`/api/event-signup/${signupId}`).then((r) => r.data);

export const apiCreatePaymentIntent = (event_id: number) =>
  api
    .post<{ client_secret: string; publishable_key: string; amount: number }>(
      '/api/stripe/create-payment-intent',
      { event_id }
    )
    .then((r) => r.data);

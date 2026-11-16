import { api } from './client';
import type { User } from '../types';

export interface LiveMemberLocation {
  user: Pick<User, 'id' | 'first_name' | 'last_name' | 'images'>;
  is_me: boolean;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  located_at: string | null;
  expires_at: string;
}

export interface LiveLocationUpdate {
  start?: boolean;
  latitude?: number;
  longitude?: number;
  heading?: number | null;
  speed?: number | null;
  located_at?: string;
  expires_at?: string;
}

export const apiGetLiveLocations = (eventId: number) =>
  api.get<LiveMemberLocation[]>(`/api/events/${eventId}/live-locations`).then((r) => r.data);

export const apiSendLiveLocation = (eventId: number, update: LiveLocationUpdate) =>
  api.post<{ expires_at: string }>(`/api/events/${eventId}/live-location`, update).then((r) => r.data);

export const apiStopLiveLocation = (eventId: number) =>
  api.delete(`/api/events/${eventId}/live-location`).then((r) => r.data);

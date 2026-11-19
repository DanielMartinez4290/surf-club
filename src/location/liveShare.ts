import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import axios from 'axios';
import { apiSendLiveLocation, apiStopLiveLocation } from '../api/liveLocation';
import { parseEventTime } from '../utils/eventTime';
import type { SurfEvent } from '../types';

// "On my way" live location sharing for an outing.
//
// The member turns it on while the app is open; iOS then keeps delivering positions
// while they drive (blue location indicator), with only "While Using" permission.
// Positions go to the server from a background task. Sharing switches itself off at
// `expiresAt`, when the member stops it, or when the server says it has ended.

const TASK_NAME = 'live-location-share';
const STORE_KEY = 'live_location_share';
const MIN_SEND_INTERVAL_MS = 10_000;

/** Sharing opens this long before an outing starts... */
export const SHARE_OPENS_BEFORE_HOURS = 6;
/** ...and shuts off this long after it starts. */
export const SHARE_CLOSES_AFTER_HOURS = 2;

export interface ActiveShare {
  eventId: number;
  eventTitle: string;
  expiresAt: string; // ISO
}

let lastSentAt = 0;

const readShare = async (): Promise<ActiveShare | null> => {
  const raw = await SecureStore.getItemAsync(STORE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveShare;
  } catch {
    return null;
  }
};

const clearLocalShare = async () => {
  await SecureStore.deleteItemAsync(STORE_KEY);
  if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(TASK_NAME).catch(() => {});
  }
};

// Must be defined at module scope so iOS can run it when the app is in the background.
// This file is imported from index.ts for that reason.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK_NAME, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;

  const share = await readShare();
  if (!share || new Date(share.expiresAt).getTime() <= Date.now()) {
    if (share) apiStopLiveLocation(share.eventId).catch(() => {});
    await clearLocalShare();
    return;
  }

  // Positions can arrive in bursts; only the newest one matters, and not more than every few seconds.
  if (Date.now() - lastSentAt < MIN_SEND_INTERVAL_MS) return;
  const latest = data.locations[data.locations.length - 1];
  lastSentAt = Date.now();

  try {
    await apiSendLiveLocation(share.eventId, {
      latitude: latest.coords.latitude,
      longitude: latest.coords.longitude,
      heading: latest.coords.heading != null && latest.coords.heading >= 0 ? latest.coords.heading : null,
      speed: latest.coords.speed != null && latest.coords.speed >= 0 ? latest.coords.speed : null,
      located_at: new Date(latest.timestamp).toISOString(),
    });
  } catch (e) {
    // 410: the share ended on the server (expired/stopped). 403: no longer going to the outing.
    const status = axios.isAxiosError(e) ? e.response?.status : undefined;
    if (status === 410 || status === 403 || status === 404) await clearLocalShare();
  }
});

/** When an outing's sharing window is open, and until when a share started now would run. */
export const shareWindow = (event: Pick<SurfEvent, 'start_time'>, now = new Date()) => {
  const start = parseEventTime(event.start_time);
  const opensAt = start.subtract(SHARE_OPENS_BEFORE_HOURS, 'hour').toDate();
  const closesAt = start.add(SHARE_CLOSES_AFTER_HOURS, 'hour').toDate();
  return { opensAt, closesAt, isOpen: now >= opensAt && now < closesAt };
};

/** The share currently running on this phone, if any (cleans up one that has run out). */
export const getActiveShare = async (): Promise<ActiveShare | null> => {
  const share = await readShare();
  if (!share) return null;
  const running = await Location.hasStartedLocationUpdatesAsync(TASK_NAME).catch(() => false);
  if (!running || new Date(share.expiresAt).getTime() <= Date.now()) {
    await clearLocalShare();
    return null;
  }
  return share;
};

export type StartShareResult = { ok: true; share: ActiveShare } | { ok: false; reason: 'permission' | 'error'; message?: string };

export const startLiveShare = async (event: Pick<SurfEvent, 'id' | 'title' | 'start_time'>): Promise<StartShareResult> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return { ok: false, reason: 'permission' };

  // Only one outing at a time.
  const existing = await readShare();
  if (existing && existing.eventId !== event.id) await stopLiveShare();

  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const { closesAt } = shareWindow(event);
    const { expires_at } = await apiSendLiveLocation(event.id, {
      start: true,
      expires_at: closesAt.toISOString(),
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      located_at: new Date(position.timestamp).toISOString(),
    });

    const share: ActiveShare = { eventId: event.id, eventTitle: event.title, expiresAt: expires_at };
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(share));
    lastSentAt = Date.now();

    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 75, // meters
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: 'Sharing your location',
        notificationBody: `Members of ${event.title} can see you on the way.`,
      },
    });
    return { ok: true, share };
  } catch (e) {
    await clearLocalShare();
    const message = axios.isAxiosError(e)
      ? (e.response?.data as { message?: string } | undefined)?.message
      : undefined;
    return { ok: false, reason: 'error', message };
  }
};

export const stopLiveShare = async () => {
  const share = await readShare();
  await clearLocalShare();
  if (share) await apiStopLiveLocation(share.eventId).catch(() => {});
};

import { api } from './client';
import type { DirectMessage, GroupMessage, SurfEvent, User } from '../types';

export interface MessageThread {
  user: Pick<User, 'id' | 'first_name' | 'last_name' | 'images'>;
  last_message: DirectMessage;
  unread_count: number;
}

export interface EventThread {
  event: Pick<SurfEvent, 'id' | 'title' | 'picture_url'>;
  last_message: GroupMessage | null;
}

export const apiGetMessageThreads = () =>
  api.get<MessageThread[]>('/api/messages/threads').then((r) => r.data);

export const apiGetEventThreads = () =>
  api.get<EventThread[]>('/api/group-messages/threads').then((r) => r.data);

export const apiGetConversation = (userIdTo: number) =>
  api
    .get<DirectMessage[]>('/api/messages/conversation', { params: { user_id_to: userIdTo } })
    .then((r) => r.data);

export const apiSendMessage = (userIdTo: number, message: string) =>
  api
    .post<DirectMessage>('/api/messages/send', { user_id_to: userIdTo, message })
    .then((r) => r.data);

export const apiMarkConversationRead = (userIdFrom: number) =>
  api.post('/api/messages/mark-read', { user_id_from: userIdFrom }).then((r) => r.data);

export const apiGetGroupConversation = (eventId: number) =>
  api
    .get<GroupMessage[]>('/api/group-messages/conversation', { params: { event_id: eventId } })
    .then((r) => r.data);

export const apiSendGroupMessage = (eventId: number, message: string) =>
  api
    .post<GroupMessage>('/api/group-messages/send', { event_id: eventId, message })
    .then((r) => r.data);

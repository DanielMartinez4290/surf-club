import { api } from './client';
import type { Report, ReportContentType, User } from '../types';

export type BlockedUser = Pick<User, 'id' | 'first_name' | 'last_name' | 'images'>;

export const apiGetBlockedUsers = () => api.get<BlockedUser[]>('/api/blocks').then((r) => r.data);

export const apiBlockUser = (userId: number) =>
  api.post('/api/blocks', { user_id: userId }).then((r) => r.data);

export const apiUnblockUser = (userId: number) => api.delete(`/api/blocks/${userId}`).then((r) => r.data);

export const apiReportContent = (params: {
  content_type: ReportContentType;
  content_id: number;
  reason: string;
  details?: string;
}) => api.post<{ message: string }>('/api/reports', params).then((r) => r.data);

export const apiAdminListReports = () => api.get<Report[]>('/api/admin/reports').then((r) => r.data);

export const apiAdminResolveReport = (reportId: number, action: 'dismiss' | 'remove_content' | 'remove_user') =>
  api.post(`/api/admin/reports/${reportId}/resolve`, { action }).then((r) => r.data);

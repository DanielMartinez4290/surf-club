import { api } from './client';
import type { Story, StoryGroup } from '../types';

export const apiGetStories = () => api.get<StoryGroup[]>('/api/stories').then((r) => r.data);

export const apiPostStory = async (
  params: { uri: string; mediaType: 'image' | 'video'; mimeType?: string | null; caption: string },
  onProgress?: (fraction: number) => void
) => {
  const filename = params.uri.split('/').pop() ?? (params.mediaType === 'video' ? 'story.mov' : 'story.jpg');
  const ext = /\.(\w+)$/.exec(filename)?.[1]?.toLowerCase();
  const type =
    params.mimeType ??
    (params.mediaType === 'video' ? (ext === 'mp4' ? 'video/mp4' : 'video/quicktime') : `image/${ext ?? 'jpeg'}`);

  const form = new FormData();
  // React Native's fetch/FormData accepts { uri, name, type } for file parts.
  form.append('media', { uri: params.uri, name: filename, type } as unknown as Blob);
  if (params.caption.trim()) form.append('caption', params.caption.trim());

  return api
    .post<Story>('/api/stories', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // videos can take a while on cell data
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(e.loaded / e.total);
      },
    })
    .then((r) => r.data);
};

export const apiMarkStoryViewed = (storyId: number) =>
  api.post(`/api/stories/${storyId}/view`).then((r) => r.data);

export const apiDeleteStory = (storyId: number) => api.delete(`/api/stories/${storyId}`).then((r) => r.data);

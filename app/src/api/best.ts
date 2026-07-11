/** BEST API (스펙 §7, 4단계). */
import { apiRequest } from './client';
import type { ApiPost } from './posts';
import type { RelationshipStatus } from '@/theme';

export type BestPeriod = 'realtime' | 'today' | 'weekly';

export type BestComment = {
  id: number;
  body: string;
  like_count: number;
  post_id: number;
  post_title: string;
  author: { nickname: string; status: RelationshipStatus; status_label: string };
};

export function bestPosts(period: BestPeriod, category?: string, token?: string | null) {
  const q = new URLSearchParams({ period });
  if (category && category !== 'all') q.set('category', category);
  return apiRequest<{ items: ApiPost[] }>(`/best?${q.toString()}`, { token });
}

export function bestComments(token?: string | null) {
  return apiRequest<{ items: BestComment[] }>('/best/comments', { token });
}

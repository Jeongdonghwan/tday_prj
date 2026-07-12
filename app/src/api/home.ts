/** 홈 API (HOME_UPDATE §2). */
import { apiRequest } from './client';

export type TrendingItem = { id: number; title: string; comment_count: number };

export function getTrending(token: string) {
  return apiRequest<{ items: TrendingItem[] }>('/home/trending', { token });
}

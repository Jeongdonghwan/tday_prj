/** 내 활동 API — 내 글 / 내 댓글. */
import { apiRequest } from './client';
import type { ApiPost } from './posts';

export type MyComment = {
  id: number;
  post_id: number;
  post_title: string;
  body: string;
  time_text: string;
  created_at: string | null;
};

export function getMyPosts(token: string) {
  return apiRequest<{ items: ApiPost[] }>('/me/posts', { token });
}

export function getMyComments(token: string) {
  return apiRequest<{ items: MyComment[] }>('/me/comments', { token });
}

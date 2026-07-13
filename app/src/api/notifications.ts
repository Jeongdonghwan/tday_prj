/** 알림 API — 내 글에 달린 댓글. 읽음(빨간점)은 클라 로컬에서 계산(서버 경량). */
import { apiRequest } from './client';

export type NotificationItem = {
  id: number;
  type: 'comment';
  post_id: number;
  post_title: string;
  actor: string;
  actor_avatar_no: number;
  snippet: string;
  created_at: string | null;
  time_text: string;
};

export function getNotifications(token: string) {
  return apiRequest<{ items: NotificationItem[] }>('/notifications', { token });
}

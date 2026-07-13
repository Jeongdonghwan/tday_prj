/**
 * 알림 읽음 상태 — 클라 로컬(마지막으로 확인한 알림의 created_at) 저장.
 * ISO 문자열 사전순 비교로 새 알림 여부를 판단해 서버 폴링/상태 부담을 없앰.
 */
import { getToken, setToken } from '@/auth/tokenStorage';

const SEEN_KEY = 'notif_seen_at';

export const getSeenAt = () => getToken(SEEN_KEY);
export const setSeenAt = (iso: string) => setToken(SEEN_KEY, iso);

/** items(최신순)와 seen 을 받아 안 읽은 알림이 있는지. */
export function hasUnread(items: { created_at: string | null }[], seen: string | null): boolean {
  return items.some((n) => n.created_at != null && (seen == null || n.created_at > seen));
}

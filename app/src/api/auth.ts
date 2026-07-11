/** 인증 관련 API 호출 (스펙 §7). */
import { apiRequest } from './client';
import type { RelationshipStatus } from '@/theme';

export type Me = {
  id: number;
  nickname: string;
  relationship_status: RelationshipStatus;
  status_label: string;
  couple_id: number | null;
  avatar_no: number;
  created_at: string | null;
  couple?: { id: number; start_date: string | null; connected: boolean };
};

export type SocialLoginResult = { token: string; user: Me; is_new: boolean };

export type SocialProvider = 'kakao' | 'apple' | 'dev';

export function socialLogin(params: {
  provider: SocialProvider;
  token?: string;
  social_id?: string;
}): Promise<SocialLoginResult> {
  return apiRequest<SocialLoginResult>('/auth/social', { method: 'POST', body: params });
}

export function fetchMe(token: string): Promise<Me> {
  return apiRequest<Me>('/me', { token });
}

export function updateMe(
  body: { relationship_status?: RelationshipStatus; push_token?: string | null; nickname?: string },
  token: string,
): Promise<Me> {
  return apiRequest<Me>('/me', { method: 'PATCH', body, token });
}

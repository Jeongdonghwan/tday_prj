/** 인증 관련 API 호출 (스펙 §7). */
import { getLocales } from 'expo-localization';

import { apiRequest } from './client';
import type { RelationshipStatus } from '@/theme';

export type AppLang = 'ko' | 'en';

export type Me = {
  id: number;
  nickname: string;
  relationship_status: RelationshipStatus;
  status_label: string;
  couple_id: number | null;
  avatar_no: number;
  lang: AppLang;
  terms_v2_agreed_at: string | null;
  created_at: string | null;
  couple?: { id: number; start_date: string | null; connected: boolean };
};

export type SocialLoginResult = { token: string; user: Me; is_new: boolean };

export type SocialProvider = 'kakao' | 'apple' | 'dev';

/** 기기 로케일 문자열(예: "ko-KR", "en-US"). 가입 시 서버 언어권 결정에 전달. */
export function deviceLocale(): string {
  return getLocales()[0]?.languageTag ?? 'en-US';
}

export function socialLogin(params: {
  provider: SocialProvider;
  token?: string;
  social_id?: string;
}): Promise<SocialLoginResult> {
  return apiRequest<SocialLoginResult>('/auth/social', {
    method: 'POST',
    body: { ...params, locale: deviceLocale() },
  });
}

/** 이메일 간편가입 — 이메일+비밀번호(8자+)만으로 가입. */
export function emailSignup(email: string, password: string): Promise<SocialLoginResult> {
  return apiRequest<SocialLoginResult>('/auth/signup', {
    method: 'POST',
    body: { email, password, locale: deviceLocale() },
  });
}

/** 이메일 로그인. */
export function emailLogin(email: string, password: string): Promise<SocialLoginResult> {
  return apiRequest<SocialLoginResult>('/auth/login', { method: 'POST', body: { email, password } });
}

export function fetchMe(token: string): Promise<Me> {
  return apiRequest<Me>('/me', { token });
}

export function updateMe(
  body: {
    relationship_status?: RelationshipStatus;
    push_token?: string | null;
    nickname?: string;
    avatar_no?: number;
    lang?: AppLang;
  },
  token: string,
): Promise<Me> {
  return apiRequest<Me>('/me', { method: 'PATCH', body, token });
}

/** 회원 탈퇴 — 개인정보 익명화 + 재로그인 차단. 성공 후 로컬 로그아웃 필요. */
export function deleteMe(token: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>('/me', { method: 'DELETE', token });
}

/** 개정 약관(v2: 게시물 2차 활용) 동의 기록. 소프트 모달 '동의' 시 호출. */
export function agreeTermsV2(token: string): Promise<{ terms_v2_agreed_at: string }> {
  return apiRequest<{ terms_v2_agreed_at: string }>('/me/terms-agree', { method: 'POST', token });
}

/** 심리테스트 앱 연동 API (DESIGN_UPDATE §6). */
import { API_BASE_URL, apiRequest } from './client';

export type TestPromo = { slug: string; title: string } | null;
export type TestBadge = { code: string; title: string; avatar_no: number } | null;

export function getTestPromo(token: string) {
  return apiRequest<{ test: TestPromo }>('/tests/promo', { token });
}

export function getTestBadge(token: string) {
  return apiRequest<{ badge: TestBadge }>('/me/test-badge', { token });
}

/** 테스트존 웹 베이스 URL (WebView·홍보용). EXPO_PUBLIC_WEB_BASE_URL 없으면 API 호스트. */
export const WEB_BASE_URL = (process.env.EXPO_PUBLIC_WEB_BASE_URL || API_BASE_URL).replace(/\/$/, '');

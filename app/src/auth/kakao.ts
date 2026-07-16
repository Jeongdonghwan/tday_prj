/**
 * 카카오 로그인.
 *
 * - 네이티브(iOS/Android): @react-native-seoul/kakao-login 네이티브 SDK 로 로그인 →
 *   accessToken 을 서버(/auth/social)로 전달. 카카오톡 앱-투-앱/계정 로그인 모두 지원.
 *   ※ 네이티브 모듈이라 EAS 개발빌드에서만 동작(Expo Go 불가). 앱 키는 app.json 플러그인 인자.
 * - 웹: 카카오 OAuth 를 서버가 처리(서버 리다이렉트 플로우). 브라우저를 서버
 *   `/auth/kakao/login` 으로 보내면 콜백에서 우리 JWT 를 발급해 웹앱으로 `#token=` 으로 돌려준다.
 */
import { Platform } from 'react-native';

import { API_BASE_URL } from '@/api/client';

export class KakaoCancelled extends Error {
  constructor() {
    super('카카오 로그인이 취소되었어요.');
    this.name = 'KakaoCancelled';
  }
}

/** 카카오 로그인이 취소로 보이는 에러인지(사용자가 창을 닫음 등). */
function isCancel(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /cancel|취소|user.?cancel/i.test(msg);
}

/**
 * 네이티브 카카오 로그인 → access token 반환.
 * 취소 시 KakaoCancelled, 그 외 실패 시 원본 에러를 던진다.
 */
export async function loginWithKakao(): Promise<string> {
  try {
    // 네이티브 모듈 — 웹 번들에 포함되지 않도록 지연 로드
    const { login } = await import('@react-native-seoul/kakao-login');
    const token = await login();
    return token.accessToken;
  } catch (e) {
    if (isCancel(e)) throw new KakaoCancelled();
    throw e;
  }
}

/**
 * 웹 카카오 로그인 시작 — 브라우저를 서버 OAuth 시작 지점으로 이동.
 * 콜백이 우리 JWT 를 현재 오리진으로 `#token=` 에 실어 돌려준다(AuthContext 가 수신).
 */
export function startKakaoWebLogin(): void {
  if (Platform.OS !== 'web') return;
  const g = globalThis as unknown as { location?: { origin: string; href: string } };
  const origin = g.location?.origin ?? '';
  const returnUrl = encodeURIComponent(origin || g.location?.href || '');
  g.location!.href = `${API_BASE_URL}/auth/kakao/login?return=${returnUrl}`;
}

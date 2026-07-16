/**
 * 인증 상태 컨텍스트 — 토큰을 SecureStore 에 저장, 앱 시작 시 복원.
 * 루트 레이아웃의 인증 가드가 이 상태로 (auth)/(tabs) 분기.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { emailLogin, emailSignup, fetchMe, socialLogin, type Me, type SocialLoginResult, type SocialProvider } from '@/api/auth';
import { registerForPush } from '@/push/registerPush';
import { deleteToken, getToken, setToken } from './tokenStorage';

const TOKEN_KEY = 'sseuljeon.jwt';

/**
 * 웹 카카오 OAuth 콜백 복귀 처리 — 서버가 `#token=` 으로 JWT 를 실어 보낸다.
 * 토큰을 꺼내고 주소창의 흔적(fragment)을 지운다. 웹이 아니면 null.
 */
function consumeWebHashToken(): string | null {
  if (Platform.OS !== 'web') return null;
  const g = globalThis as unknown as {
    location?: { hash: string; pathname: string; search: string };
    history?: { replaceState: (s: unknown, t: string, u: string) => void };
  };
  const hash = g.location?.hash ?? '';
  const m = /[#&]token=([^&]+)/.exec(hash);
  if (!m) return null;
  const token = decodeURIComponent(m[1]);
  try {
    g.history?.replaceState(null, '', `${g.location!.pathname}${g.location!.search}`);
  } catch {
    /* noop */
  }
  return token;
}

type AuthState = {
  ready: boolean; // 부팅 시 토큰 복원 완료 여부
  token: string | null;
  user: Me | null;
  signIn: (params: { provider: SocialProvider; token?: string; social_id?: string }) => Promise<void>;
  emailAuth: (mode: 'signup' | 'login', email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<Me | null>(null);

  // 부팅: (웹) 카카오 콜백 토큰 수신 → 저장된 토큰 복원 + /me 확인
  useEffect(() => {
    (async () => {
      try {
        const webTok = consumeWebHashToken();
        const saved = webTok ?? (await getToken(TOKEN_KEY));
        if (saved) {
          if (webTok) await setToken(TOKEN_KEY, webTok); // 새로 받은 웹 토큰은 저장
          setTokenState(saved);
          try {
            setUser(await fetchMe(saved));
          } catch {
            // 토큰 만료/무효 → 폐기
            await deleteToken(TOKEN_KEY);
            setTokenState(null);
          }
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function finishLogin(res: SocialLoginResult) {
    await setToken(TOKEN_KEY, res.token);
    setTokenState(res.token);
    setUser(res.user);
    // 푸시 토큰 등록 (best-effort, Expo Go 에선 noop)
    void registerForPush(res.token);
  }

  async function signIn(params: { provider: SocialProvider; token?: string; social_id?: string }) {
    await finishLogin(await socialLogin(params));
  }

  async function emailAuth(mode: 'signup' | 'login', email: string, password: string) {
    await finishLogin(mode === 'signup' ? await emailSignup(email, password) : await emailLogin(email, password));
  }

  async function signOut() {
    await deleteToken(TOKEN_KEY);
    setTokenState(null);
    setUser(null);
  }

  async function refresh() {
    if (token) setUser(await fetchMe(token));
  }

  const value = useMemo<AuthState>(
    () => ({ ready, token, user, signIn, emailAuth, signOut, refresh }),
    [ready, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

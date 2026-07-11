/**
 * 인증 상태 컨텍스트 — 토큰을 SecureStore 에 저장, 앱 시작 시 복원.
 * 루트 레이아웃의 인증 가드가 이 상태로 (auth)/(tabs) 분기.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchMe, socialLogin, type Me, type SocialProvider } from '@/api/auth';
import { registerForPush } from '@/push/registerPush';
import { deleteToken, getToken, setToken } from './tokenStorage';

const TOKEN_KEY = 'sseuljeon.jwt';

type AuthState = {
  ready: boolean; // 부팅 시 토큰 복원 완료 여부
  token: string | null;
  user: Me | null;
  signIn: (params: { provider: SocialProvider; token?: string; social_id?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<Me | null>(null);

  // 부팅: 저장된 토큰 복원 + /me 확인
  useEffect(() => {
    (async () => {
      try {
        const saved = await getToken(TOKEN_KEY);
        if (saved) {
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

  async function signIn(params: { provider: SocialProvider; token?: string; social_id?: string }) {
    const res = await socialLogin(params);
    await setToken(TOKEN_KEY, res.token);
    setTokenState(res.token);
    setUser(res.user);
    // 푸시 토큰 등록 (best-effort, Expo Go 에선 noop)
    void registerForPush(res.token);
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
    () => ({ ready, token, user, signIn, signOut, refresh }),
    [ready, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

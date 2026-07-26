/** 오늘 운세 상태 공유 — 홈 미니카드와 오늘연애 탭이 /fortune/today 를 중복 호출하지 않게 캐시. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { getFortuneToday, type FortuneToday } from '@/api/fortune';
import { useAuth } from '@/auth/AuthContext';

type FortuneState = {
  data: FortuneToday | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (d: FortuneToday) => void;
};

const Ctx = createContext<FortuneState | null>(null);

export function FortuneProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [data, setData] = useState<FortuneToday | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!token) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      setData(await getFortuneToday(token));
    } catch {
      /* 유지 */
    } finally {
      setLoading(false);
    }
  }, [token]);

  const value = useMemo<FortuneState>(() => ({ data, loading, reload, setData }), [data, loading, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFortune(): FortuneState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFortune must be used within FortuneProvider');
  return ctx;
}

/**
 * 스택 화면용 하단 GNB — 글상세·이슈상세·설정 등 (tabs) 밖 화면에서도 GNB 를 유지한다.
 * 데스크톱(상단 GNB)·모달 화면(글쓰기·사진등록·운세온보딩)·키보드 열림 중에는 숨김.
 */
import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { BottomNavView, NAV_ITEMS, type NavName } from '@/components/BottomNav';
import { useIsDesktop } from '@/hooks/useResponsive';

const HIDDEN_PREFIXES = ['/write', '/photos/new', '/fortune-onboarding', '/couple/notes/new', '/login', '/(auth)'];

function activeFor(pathname: string): NavName | null {
  if (pathname.startsWith('/post')) return 'community';
  if (pathname.startsWith('/issue')) return 'issues';
  return null;
}

export function GlobalBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const s = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const h = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  if (isDesktop || keyboardOpen) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const go = (name: NavName) => {
    const item = NAV_ITEMS.find((i) => i.name === name);
    if (item) router.navigate(item.path as never);
  };

  return <BottomNavView active={activeFor(pathname)} onPress={go} />;
}

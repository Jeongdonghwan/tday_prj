/**
 * 루트 레이아웃 — AuthProvider + 인증 가드 + 루트 Stack.
 * 미로그인이면 (auth)/login, 로그인되면 (tabs) 로 분기.
 */
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import '@/i18n'; // i18n 초기화 (기기 로케일 기준, 로그인 후 user.lang 로 동기화)
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { FortuneProvider } from '@/fortune/FortuneContext';
import { TermsConsentModal } from '@/components/TermsConsentModal';
import { DesktopShell } from '@/components/web/DesktopShell';
import { useIsDesktop } from '@/hooks/useResponsive';
import { usePushRouting } from '@/push/usePushRouting';

function useProtectedRoute() {
  const { ready, token } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === '(auth)';
    // 웹은 게스트 열람 허용 (SEO·유입) — 로그인 화면으로 강제 이동하지 않음.
    // 네이티브 앱은 로그인 우선 유지.
    if (!token && !inAuthGroup && Platform.OS !== 'web') {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [ready, token, segments, router]);
}

function RootNavigator() {
  const { ready } = useAuth();
  const isDesktop = useIsDesktop();
  const segments = useSegments();
  useProtectedRoute();
  usePushRouting();

  if (!ready) return null; // 스플래시 유지 구간 (토큰 복원 중)

  const stack = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="post/[id]" />
      <Stack.Screen name="issue/[id]" />
      <Stack.Screen name="write" options={{ presentation: 'modal' }} />
      <Stack.Screen name="couple/connect" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="tests" />
      <Stack.Screen name="daily" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="search" />
      <Stack.Screen name="my-activity" />
      <Stack.Screen name="photos/index" />
      <Stack.Screen name="photos/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="profile-edit" />
      <Stack.Screen name="fortune-onboarding" options={{ presentation: 'modal' }} />
      <Stack.Screen name="fortune-settings" />
    </Stack>
  );

  // 개정 약관 소프트 재동의 모달 — 로그인 유저 & 미동의 시 오버레이(비차단)
  const withModal = (
    <>
      {stack}
      <TermsConsentModal />
    </>
  );

  // 데스크톱(웹): 로그인 화면을 제외한 모든 화면(글쓰기·글상세 포함)을 GNB 아래에 렌더
  if (isDesktop && segments[0] !== '(auth)') return <DesktopShell>{withModal}</DesktopShell>;
  return withModal;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <FortuneProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </FortuneProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

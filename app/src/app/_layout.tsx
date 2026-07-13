/**
 * 루트 레이아웃 — AuthProvider + 인증 가드 + 루트 Stack.
 * 미로그인이면 (auth)/login, 로그인되면 (tabs) 로 분기.
 */
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { usePushRouting } from '@/push/usePushRouting';

function useProtectedRoute() {
  const { ready, token } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [ready, token, segments, router]);
}

function RootNavigator() {
  const { ready } = useAuth();
  useProtectedRoute();
  usePushRouting();

  if (!ready) return null; // 스플래시 유지 구간 (토큰 복원 중)

  return (
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
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

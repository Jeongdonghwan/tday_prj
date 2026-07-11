/**
 * Expo Push 토큰 등록 (스펙 §7: 푸시).
 * - dev/prod 빌드: 권한 요청 → Expo push token 획득 → 서버 PATCH /me 에 저장.
 * - Expo Go(SDK 53+): 원격 푸시 토큰 미발급 → 조용히 noop.
 * 호출: 로그인 직후 best-effort (실패해도 앱 흐름 막지 않음).
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { updateMe } from '@/api/auth';

export async function registerForPush(token: string): Promise<void> {
  try {
    if (!Device.isDevice) return; // 시뮬레이터는 원격 푸시 불가

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const pushToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;

    if (pushToken) {
      await updateMe({ push_token: pushToken }, token);
    }
  } catch {
    // Expo Go 등 토큰 미발급 환경 — 무시
  }
}

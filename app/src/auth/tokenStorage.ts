/**
 * 토큰 저장소 — 플랫폼별 분리.
 * - 네이티브(iOS/Android): expo-secure-store (Keychain/Keystore)
 * - 웹: localStorage (SecureStore 는 웹 미지원)
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

export async function getToken(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setToken(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* noop */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteToken(key: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* noop */
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

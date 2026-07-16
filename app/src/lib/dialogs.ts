/** 웹/네이티브 겸용 알림·확인 다이얼로그 — react-native-web 은 Alert 버튼을 지원하지 않음. */
import { Alert, Platform } from 'react-native';

type WebGlobals = { alert?: (m: string) => void; confirm?: (m: string) => boolean };

/** 단순 알림 (확인 버튼 1개). */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    (globalThis as unknown as WebGlobals).alert?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/** 확인/취소 — 확인 시 true. */
export function confirmAsync(title: string, message: string, confirmText = '확인'): Promise<boolean> {
  if (Platform.OS === 'web') {
    const ok = (globalThis as unknown as WebGlobals).confirm?.(`${title}\n\n${message}`) ?? false;
    return Promise.resolve(ok);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: '취소', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

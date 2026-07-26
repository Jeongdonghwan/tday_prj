/** 운세/궁합 결과를 이미지로 캡처해 공유 (FORTUNE_UPDATE.md §8).
 *  react-native-view-shot 로 off-screen 카드 ref 를 PNG 로 캡처 → expo-sharing 으로 시트 오픈.
 *  네이티브 캡처가 불가한 환경(웹/Expo Go 등)에서는 링크 공유로 폴백. */
import { Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { shareUrl } from '@/lib/share';

/** viewRef 를 이미지로 캡처해 공유. 실패 시 링크(fallbackUrl/message)로 폴백. */
export async function shareCardImage(
  viewRef: React.RefObject<unknown>,
  fallbackUrl: string,
  message: string,
): Promise<void> {
  // 웹은 view-shot 미지원 → 링크 공유
  if (Platform.OS === 'web' || !viewRef.current) {
    return shareUrl(fallbackUrl, message);
  }
  try {
    const uri = await captureRef(viewRef as never, { format: 'png', quality: 1 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: message });
      return;
    }
  } catch {
    /* 캡처/공유 실패 → 링크 폴백 */
  }
  return shareUrl(fallbackUrl, message);
}

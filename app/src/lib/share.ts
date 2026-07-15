/** 링크 공유 — 네이티브 시트 / 웹 navigator.share·클립보드 폴백. */
import { Platform, Share } from 'react-native';

export async function shareUrl(url: string, message?: string) {
  if (Platform.OS === 'web') {
    const nav = globalThis.navigator as unknown as {
      share?: (d: { title?: string; text?: string; url?: string }) => Promise<void>;
      clipboard?: { writeText: (t: string) => Promise<void> };
    };
    if (nav?.share) {
      try {
        await nav.share({ text: message, url });
        return;
      } catch {
        /* 취소 등 — 폴백 */
      }
    }
    try {
      await nav?.clipboard?.writeText(url);
    } catch {
      /* noop */
    }
    return;
  }
  try {
    await Share.share({ message: message ? `${message}\n${url}` : url });
  } catch {
    /* 취소 */
  }
}

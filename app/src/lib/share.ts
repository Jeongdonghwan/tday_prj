/** 링크 공유 — 네이티브 시트 / 웹 navigator.share·클립보드 폴백. */
import { Platform, Share } from 'react-native';

export async function shareUrl(url: string, message?: string) {
  if (Platform.OS === 'web') {
    const g = globalThis as unknown as {
      navigator?: {
        share?: (d: { title?: string; text?: string; url?: string }) => Promise<void>;
        clipboard?: { writeText: (t: string) => Promise<void> };
      };
      alert?: (m: string) => void;
      prompt?: (m: string, v?: string) => void;
    };
    // 네이티브 공유 시트가 있으면 그것만 사용(취소해도 복사로 넘어가지 않음)
    if (g.navigator?.share) {
      try {
        await g.navigator.share({ text: message, url });
      } catch {
        /* 사용자 취소 */
      }
      return;
    }
    // 없으면 클립보드 복사 + 안내(데스크톱 브라우저 다수)
    try {
      await g.navigator?.clipboard?.writeText(url);
      g.alert?.('공유 링크를 복사했어요! 친구에게 붙여넣기 해주세요.');
    } catch {
      g.prompt?.('아래 링크를 복사해 공유하세요', url);
    }
    return;
  }
  try {
    await Share.share({ message: message ? `${message}\n${url}` : url });
  } catch {
    /* 취소 */
  }
}

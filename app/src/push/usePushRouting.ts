/**
 * 푸시 알림 탭 랜딩 라우팅 (HOME_UPDATE §1: 탭 개편 후 랜딩 경로 갱신).
 * data.type 별 목적지 — best→글 상세, daily*→커플 오늘의질문, issue→연애이슈 탭, fortune→오늘연애 탭.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

type PushData = { type?: string; post_id?: number; question_id?: number };

export function usePushRouting() {
  const router = useRouter();

  useEffect(() => {
    const route = (data: PushData | null | undefined) => {
      if (!data?.type) return;
      if (data.type === 'best' && data.post_id) {
        router.push({ pathname: '/post/[id]', params: { id: data.post_id } });
      } else if (data.type === 'fortune') {
        router.push('/fortune');
      } else if (data.type.startsWith('daily')) {
        router.push('/daily');
      } else if (data.type === 'issue') {
        router.push('/issues');
      }
    };

    // 앱이 알림 탭으로 콜드스타트된 경우
    Notifications.getLastNotificationResponseAsync?.()
      .then((resp) => resp && route(resp.notification.request.content.data as PushData))
      .catch(() => {});

    // 실행 중 알림 탭
    const sub = Notifications.addNotificationResponseReceivedListener?.((resp) =>
      route(resp.notification.request.content.data as PushData),
    );
    return () => sub?.remove?.();
  }, [router]);
}

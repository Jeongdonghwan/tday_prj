/**
 * 위젯 데이터 계층 (스펙 §9). 크로스플랫폼·테스트 대상.
 * /couple/dday + /daily/today 를 위젯 표시 텍스트로 직렬화.
 * 네이티브 위젯은 이 payload 를 App Group 공유 저장소에서 읽는다(빌드 필요).
 */
import { getDday } from '@/api/couple';
import { getToday } from '@/api/daily';

export type WidgetPayload = {
  ddayText: string; // 예: "준호님과 327일째" / "커플 연결하기"
  questionText: string; // 예: "오늘 질문 도착" / "오늘 답변 완료"
  hasToday: boolean; // 오늘 미답변 질문 존재 여부
};

export async function buildWidgetData(token: string): Promise<WidgetPayload> {
  const [dday, today] = await Promise.all([
    getDday(token).catch(() => null),
    getToday(token).catch(() => null),
  ]);

  const ddayText =
    dday?.connected && dday.days != null && dday.partner
      ? `${dday.partner}님과 ${dday.days}일째`
      : '커플 연결하기';

  const hasToday = !!today?.question && today.my_answer == null;
  const questionText = today?.question
    ? hasToday
      ? '오늘 질문 도착'
      : '오늘 답변 완료'
    : '오늘 질문 준비 중';

  return { ddayText, questionText, hasToday };
}

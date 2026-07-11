/** 오늘의 질문 API (스펙 §7, 5단계). */
import { apiRequest } from './client';

export type DailyToday = {
  question: { id: number; text: string; date: string } | null;
  my_answer: string | null;
  streak: number;
  connected: boolean;
  partner?: { nickname: string; answered: boolean; answer: string | null };
  past: { id: number; text: string; answered: boolean }[];
};

export function getToday(token: string) {
  return apiRequest<DailyToday>('/daily/today', { token });
}

export function submitAnswer(answer: string, token: string, questionId?: number) {
  return apiRequest<{ ok: boolean; streak: number }>('/daily/answer', {
    method: 'POST',
    body: { answer, question_id: questionId },
    token,
  });
}

export function questionToPost(questionId: number, token: string) {
  return apiRequest<{ post_id: number }>(`/daily/${questionId}/to-post`, { method: 'POST', token });
}

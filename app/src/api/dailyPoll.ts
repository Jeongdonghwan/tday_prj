/** 커뮤니티 A/B 데일리 폴 API (DESIGN_UPDATE §3). */
import { apiRequest } from './client';

export type PollSide = 'a' | 'b' | 'c';
export type PollChoice = { side: PollSide; label: string; count: number; pct: number };

export type DailyPollData = {
  id: number;
  question: string;
  choices: PollChoice[];
  total: number;
  my_vote: PollSide | null;
  partner_vote: PollSide | null;
};

export type DailyPollToday = {
  poll: DailyPollData | null;
  past: { id: number; question: string; top_label: string; top_pct: number }[];
};

export function getDailyPoll(token: string) {
  return apiRequest<DailyPollToday>('/daily-poll/today', { token });
}

export function voteDailyPoll(side: PollSide, token: string) {
  return apiRequest<{ poll: DailyPollData }>('/daily-poll/vote', { method: 'POST', body: { side }, token });
}

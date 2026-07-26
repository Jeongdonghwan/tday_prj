/** 연애운세 API (FORTUNE_UPDATE.md §5). 모두 로그인 필수. */
import { apiRequest } from './client';

export type LoveStatus = 'solo' | 'some' | 'couple' | 'rebound';
export type PushTime = '00' | '07' | '09';

export type LuckyItem = { emoji: string; name: string };
export type FortuneCat = { name: string; comment: string; score: number | null };
export type Tarot = { index: number; name_kr: string; name_en: string; meaning: string };

export type FortuneToday =
  | { registered: false }
  | {
      registered: true;
      published: boolean;
      date: string;
      unavailable?: boolean;
      nickname?: string;
      zodiac?: string;
      love_status?: LoveStatus;
      score?: number;
      summary?: string;
      full_text?: string;
      cats?: FortuneCat[];
      lucky?: { color: LuckyItem; item: LuckyItem; time: LuckyItem; place: LuckyItem };
      tarot?: Tarot;
      streak?: number;
      thread_id?: number | null;
    };

export type FortuneProfileInput = {
  birth_date: string; // YYYY-MM-DD
  birth_time?: number | null; // 0~11 or null
  gender: 'F' | 'M';
  love_status: LoveStatus;
  push_enabled?: boolean;
  push_time?: PushTime;
};

export function getFortuneToday(token: string) {
  return apiRequest<FortuneToday>('/fortune/today', { token });
}

export type FortuneProfileData =
  | { registered: false }
  | {
      registered: true;
      birth_date: string;
      birth_time: number | null;
      gender: 'F' | 'M';
      love_status: LoveStatus;
      push_enabled: boolean;
      push_time: PushTime;
    };

export function getFortuneProfile(token: string) {
  return apiRequest<FortuneProfileData>('/fortune/profile', { token });
}

export function saveFortuneProfile(body: FortuneProfileInput, token: string) {
  return apiRequest<FortuneToday>('/fortune/profile', { method: 'POST', body, token });
}

export function readFortune(token: string) {
  return apiRequest<{ streak: number }>('/fortune/read', { method: 'POST', token });
}

export function getCompatibility(partnerBirth: string, token: string) {
  return apiRequest<{ score: number; comment: string }>('/fortune/compatibility', {
    method: 'POST',
    body: { partner_birth: partnerBirth },
    token,
  });
}

export type FortuneHistoryItem = { date: string; score: number; summary: string; full_text: string };

export function getFortuneHistory(days: number, token: string) {
  return apiRequest<{ items: FortuneHistoryItem[] }>(`/fortune/history?days=${days}`, { token });
}

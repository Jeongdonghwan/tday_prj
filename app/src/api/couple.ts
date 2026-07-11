/** 커플 연결 + 캘린더 API (스펙 §7, 6단계). */
import { apiRequest } from './client';

export type Dday = {
  connected: boolean;
  partner: string | null;
  start_date: string | null;
  days?: number;
  next?: { label: string; d_day: number };
};

export type Schedule = {
  id: number;
  owner: 'a' | 'b' | 'both';
  title: string;
  event_date: string;
  event_time: string | null;
};

export function createInvite(token: string) {
  return apiRequest<{ invite_code: string; connected: boolean }>('/couple/invite', { method: 'POST', token });
}

export function joinCouple(code: string, token: string) {
  return apiRequest<{ ok: boolean; couple_id: number; partner: string | null }>('/couple/join', {
    method: 'POST',
    body: { code },
    token,
  });
}

export function setStartDate(date: string, token: string) {
  return apiRequest<{ ok: boolean; start_date: string }>('/couple/start-date', {
    method: 'PATCH',
    body: { date },
    token,
  });
}

export function getDday(token: string) {
  return apiRequest<Dday>('/couple/dday', { token });
}

export function listSchedules(month: string, token: string) {
  return apiRequest<{ items: Schedule[] }>(`/schedules?month=${month}`, { token });
}

export function createSchedule(
  body: { owner: 'a' | 'b' | 'both'; title: string; event_date: string; event_time?: string },
  token: string,
) {
  return apiRequest<Schedule>('/schedules', { method: 'POST', body, token });
}

export function deleteSchedule(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/schedules/${id}`, { method: 'DELETE', token });
}

/** 오늘의 연애 이슈 API (DESIGN_UPDATE §5). */
import { apiRequest } from './client';
import type { ApiComment } from './posts';

export type IssuePoll = {
  a_label: string;
  b_label: string;
  a_votes: number;
  b_votes: number;
  total: number;
  a_pct: number;
  my_vote: 'a' | 'b' | null;
};

export type Issue = {
  id: number;
  title: string;
  summary: string;
  source: string | null;
  url: string | null;
  comment_count: number;
  poll: IssuePoll;
  my_vote: 'a' | 'b' | null;
};

export type IssueArchiveItem = {
  id: number;
  title: string;
  date: string;
  a_label: string;
  b_label: string;
  a_pct: number;
  total: number;
  comment_count: number;
};

export function getTodayIssue(token?: string | null) {
  return apiRequest<{ issue: Issue | null }>('/issues/today', { token });
}

export function getIssueArchive(token?: string | null) {
  return apiRequest<{ items: IssueArchiveItem[] }>('/issues/archive', { token });
}

export function getIssue(id: number | string, token?: string | null) {
  return apiRequest<{ issue: Issue }>(`/issues/${id}`, { token });
}

export function voteIssue(id: number | string, side: 'a' | 'b', token: string) {
  return apiRequest<{ issue: Issue }>(`/issues/${id}/vote`, { method: 'POST', body: { side }, token });
}

export function listIssueComments(id: number | string, token?: string | null) {
  return apiRequest<{ items: ApiComment[]; count: number }>(`/issues/${id}/comments`, { token });
}

export function createIssueComment(id: number | string, body: string, token: string) {
  return apiRequest<ApiComment>(`/issues/${id}/comments`, { method: 'POST', body: { body }, token });
}

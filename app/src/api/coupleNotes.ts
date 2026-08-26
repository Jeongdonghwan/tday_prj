/** 속마음이야기 API — 커플 전용 회고 노트 (제목 / 좋았던 점 / 아쉬웠던 점 / 개선할 점). 커플 미연결 시 403 couple_required. */
import { apiRequest } from './client';

export type NoteUser = { id: number; nickname: string; avatar_no: number };
export type NoteComment = {
  id: number;
  author: NoteUser;
  is_mine: boolean;
  body: string;
  created_at: string;
  time_ago: string;
};
export type CoupleNote = {
  id: number;
  author: NoteUser;
  is_mine: boolean;
  title: string;
  good: string;
  bad: string;
  improve: string;
  note_date: string | null;
  created_at: string;
  time_ago: string;
  comment_count: number;
  comments?: NoteComment[];
};
export type NoteInput = { title: string; good: string; bad: string; improve: string; note_date?: string };

export function listCoupleNotes(token: string) {
  return apiRequest<{ items: CoupleNote[]; partner: NoteUser | null }>('/couple/notes', { token });
}
export function getCoupleNote(id: number, token: string) {
  return apiRequest<CoupleNote>(`/couple/notes/${id}`, { token });
}
export function createCoupleNote(body: NoteInput, token: string) {
  return apiRequest<CoupleNote>('/couple/notes', { method: 'POST', body, token });
}
export function updateCoupleNote(id: number, body: NoteInput, token: string) {
  return apiRequest<CoupleNote>(`/couple/notes/${id}`, { method: 'PUT', body, token });
}
export function deleteCoupleNote(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/couple/notes/${id}`, { method: 'DELETE', token });
}
export function addCoupleNoteComment(id: number, body: string, token: string) {
  return apiRequest<NoteComment>(`/couple/notes/${id}/comments`, { method: 'POST', body: { body }, token });
}

/** 양식 섹션 정의 — 작성/상세 공용 */
export const NOTE_SECTIONS: { key: 'good' | 'bad' | 'improve'; emoji: string; label: string; placeholder: string }[] = [
  { key: 'good', emoji: '💗', label: '좋았던 점', placeholder: '함께해서 좋았던 순간, 고마웠던 것' },
  { key: 'bad', emoji: '😢', label: '아쉬웠던 점', placeholder: '서운했거나 아쉬웠던 것 (비난 대신 내 마음으로)' },
  { key: 'improve', emoji: '🌱', label: '개선할 점', placeholder: '다음엔 이렇게 해보자!' },
];

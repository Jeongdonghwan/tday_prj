/** 오늘연애 글/투표/댓글 API (스펙 §7, 3단계). */
import { apiRequest } from './client';
import type { FeedPost } from '@/components/PostCard';
import type { PostCategory, RelationshipStatus } from '@/theme';

export type ApiAuthor = {
  id: number | null;
  nickname: string;
  status: RelationshipStatus;
  status_label: string;
  avatar_no: number;
};

export type ApiPoll = {
  a_label: string;
  b_label: string;
  a_votes: number;
  b_votes: number;
  total: number;
  a_pct: number;
  my_vote: 'A' | 'B' | null;
};

export type ApiPost = {
  id: number;
  category: PostCategory;
  category_label: string;
  title: string;
  body: string | null;
  is_poll: boolean;
  author: ApiAuthor;
  time_text: string;
  created_at: string | null;
  view_count: number;
  like_count: number;
  liked?: boolean;
  comment_count: number;
  image_url?: string | null;
  poll?: ApiPoll;
};

export type ApiComment = {
  id: number;
  parent_id: number | null;
  body: string;
  like_count: number;
  author: ApiAuthor;
  time_text: string;
  created_at: string | null;
  reply_count: number;
  replies: ApiComment[];
};

type Tok = string | null | undefined;

/** 말머리 미니뱃지 (DESIGN_UPDATE §2). */
function tagOf(p: ApiPost): string {
  if (p.is_poll) return '투표';
  if (p.category === 'counsel') return '고민';
  return '썰';
}

/** API 글 → 피드 카드 표시 모델 변환. */
export function toFeedPost(p: ApiPost): FeedPost {
  return {
    id: p.id,
    tag: tagOf(p),
    categoryLabel: p.category_label,
    title: p.title,
    body: p.body ?? undefined,
    authorName: p.author.nickname,
    authorStatus: p.author.status,
    authorAvatarNo: p.author.avatar_no,
    timeText: p.time_text,
    viewCount: p.view_count,
    poll: p.poll ? { aLabel: p.poll.a_label, bLabel: p.poll.b_label, aPct: p.poll.a_pct } : undefined,
    voteCount: p.poll ? p.poll.total : undefined,
    myVote: p.poll ? p.poll.my_vote : undefined,
    likeCount: p.like_count,
    commentCount: p.comment_count,
    imageUrl: p.image_url ?? undefined,
  };
}

export function listPosts(params: { category?: string; cursor?: number | null; q?: string; token?: Tok }) {
  const q = new URLSearchParams();
  if (params.category && params.category !== 'all') q.set('category', params.category);
  if (params.cursor) q.set('cursor', String(params.cursor));
  if (params.q?.trim()) q.set('q', params.q.trim());
  const qs = q.toString();
  return apiRequest<{ items: ApiPost[]; next_cursor: number | null }>(`/posts${qs ? `?${qs}` : ''}`, {
    token: params.token,
  });
}

export function getPost(id: number | string, token?: Tok) {
  return apiRequest<ApiPost>(`/posts/${id}`, { token });
}

export type CreatePostBody = {
  category: PostCategory;
  title: string;
  body?: string;
  is_poll?: boolean;
  poll?: { a: string; b: string };
  image_url?: string;
};

export function createPost(body: CreatePostBody, token: string) {
  return apiRequest<ApiPost>('/posts', { method: 'POST', body, token });
}

/** 내 글 수정 — 제목/본문/카테고리만 (투표 선택지는 수정 불가). */
export function updatePost(
  id: number | string,
  body: { title?: string; body?: string; category?: string },
  token: string,
) {
  return apiRequest<ApiPost>(`/posts/${id}`, { method: 'PATCH', body, token });
}

/** 내 글 삭제. */
export function deletePost(id: number | string, token: string) {
  return apiRequest<{ ok: boolean }>(`/posts/${id}`, { method: 'DELETE', token });
}

export function votePost(id: number | string, side: 'A' | 'B', token: string) {
  return apiRequest<ApiPost>(`/posts/${id}/vote`, { method: 'POST', body: { side }, token });
}

export function likePost(id: number | string, token: string) {
  return apiRequest<{ like_count: number; liked: boolean }>(`/posts/${id}/like`, { method: 'POST', token });
}

export function listComments(id: number | string, token?: Tok) {
  return apiRequest<{ items: ApiComment[]; count: number }>(`/posts/${id}/comments`, { token });
}

export function createComment(id: number | string, body: string, token: string, parentId?: number) {
  return apiRequest<ApiComment>(`/posts/${id}/comments`, {
    method: 'POST',
    body: { body, parent_id: parentId ?? null },
    token,
  });
}

export function likeComment(id: number | string, token: string) {
  return apiRequest<{ like_count: number }>(`/comments/${id}/like`, { method: 'POST', token });
}

/** AI 투표 선택지 제안 (스펙 §6: 비워두면 AI가 제안). 키 미설정 시 503. */
export function suggestPoll(body: { title: string; body?: string }, token: string) {
  return apiRequest<{ a: string; b: string }>('/ai/poll-suggest', { method: 'POST', body, token });
}

/** 신고/차단 API (스펙 §7, 4단계). */
import { apiRequest } from './client';

export type Block = { block_id: number; user_id: number; nickname: string };

export function reportTarget(
  params: { target_type: 'post' | 'comment' | 'user'; target_id: number; reason?: string },
  token: string,
) {
  return apiRequest<{ ok: boolean; blinded: boolean }>('/reports', { method: 'POST', body: params, token });
}

export function blockUser(blockedUserId: number, token: string) {
  return apiRequest<{ ok: boolean }>('/blocks', { method: 'POST', body: { blocked_user_id: blockedUserId }, token });
}

export function listBlocks(token: string) {
  return apiRequest<{ items: Block[] }>('/blocks', { token });
}

export function unblock(blockId: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/blocks/${blockId}`, { method: 'DELETE', token });
}

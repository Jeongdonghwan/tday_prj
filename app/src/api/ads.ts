/** 광고 슬롯 API — 포지션별 활성 광고(공개) + 클릭 카운트. */
import { apiRequest } from './client';

export type AdPosition = 'feed_native' | 'issue_bottom' | 'web_wing_l' | 'web_wing_r' | 'web_rail';
export type Ad = { id: number; image: string; link_url: string };

export function getAd(position: AdPosition) {
  return apiRequest<{ ad: Ad | null }>(`/ads?position=${position}`);
}

export function clickAd(id: number) {
  return apiRequest<{ ok: boolean }>(`/ads/${id}/click`, { method: 'POST' });
}

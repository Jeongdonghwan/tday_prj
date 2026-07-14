/** 광고 슬롯 순수 로직 — 포지션별 1회 fetch 캐시 + 사이즈 매핑 (렌더러 없이 테스트 가능). */
import { getAd, type Ad, type AdPosition } from '@/api/ads';

const cache: Partial<Record<AdPosition, Promise<Ad | null>>> = {};

/** 포지션당 한 번만 활성 광고를 조회(노출/요청 폭주 방지). 실패 시 null. */
export function fetchAd(position: AdPosition): Promise<Ad | null> {
  if (!cache[position]) cache[position] = getAd(position).then((r) => r.ad).catch(() => null);
  return cache[position]!;
}

/** 테스트용 캐시 초기화. */
export function _resetAdCache() {
  (Object.keys(cache) as AdPosition[]).forEach((k) => delete cache[k]);
}

/** 웹 윙/레일은 고정 크기, feed/issue 는 가변(null). */
export function adSize(position: AdPosition): { width: number; height: number } | null {
  if (position === 'web_rail') return { width: 300, height: 100 };
  if (position === 'web_wing_l' || position === 'web_wing_r') return { width: 240, height: 600 };
  return null;
}

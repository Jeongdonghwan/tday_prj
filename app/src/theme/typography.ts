/**
 * 디자인 토큰 — 타이포 (스펙 §4: Pretendard, 위계는 weight 400/600/700/800)
 *
 * Pretendard TTF 를 assets/fonts/ 에 넣고 useAppFonts() 로 로드하면
 * fontFamily 가 Pretendard 로 매핑된다. 폰트 미탑재 시 시스템 폰트 + weight 폴백.
 */
import { Platform } from 'react-native';

export const weight = {
  regular: '400',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export type Weight = keyof typeof weight;

/** Pretendard 로드 시 사용할 패밀리명 (useAppFonts 와 키 일치) */
export const pretendardFamily: Record<Weight, string> = {
  regular: 'Pretendard-Regular',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  extrabold: 'Pretendard-ExtraBold',
};

/**
 * 텍스트 스타일 헬퍼. 폰트 로드 여부와 무관하게 안전.
 * - 폰트 탑재 전: 시스템 폰트 + fontWeight
 * - 탑재 후: useAppFonts 가 true 면 pretendard family 사용
 */
export function font(w: Weight = 'regular', loaded = false) {
  if (loaded) {
    return { fontFamily: pretendardFamily[w] };
  }
  return Platform.select({
    // RN 에서 안드로이드는 fontWeight 문자열을 일부만 지원 → 시스템 폴백
    default: { fontWeight: weight[w] as '400' | '600' | '700' | '800' },
  });
}

export const fontSize = {
  brand: 21,
  h1: 23,
  h2: 20,
  title: 16.5,
  body: 15,
  sub: 13.5,
  caption: 12,
  micro: 11,
} as const;

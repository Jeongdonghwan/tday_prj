/** 투표 결과바 순수 로직 (렌더러 없이 단위테스트 가능하도록 분리). */
import { colors } from '@/theme';

/** A 득표율(0~100) → 세그먼트 판정. */
export function pollBar(aPct: number) {
  return { bPct: 100 - aPct, tie: aPct === 50, aWin: aPct > 50, bWin: aPct < 50 };
}

/** 라벨/퍼센트 색: 우세=잉크+로즈, 열세=그레이, 동률=그레이 라벨+잉크 퍼센트. */
export function sideColors(win: boolean, tie: boolean) {
  return {
    label: win ? colors.ink : colors.sub,
    pct: win ? colors.rose : tie ? colors.ink : colors.sub,
  };
}

/** 세그먼트 색: 우세만 로즈, 나머지 뉴트럴. */
export function segColor(win: boolean) {
  return win ? colors.rose : colors.neutralBar;
}

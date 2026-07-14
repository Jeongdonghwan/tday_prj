import { pollBar, segColor, sideColors } from './pollResultStyle';
import { colors } from '@/theme';

describe('pollBar', () => {
  it('A 우세', () => expect(pollBar(75)).toEqual({ bPct: 25, tie: false, aWin: true, bWin: false }));
  it('B 우세', () => expect(pollBar(30)).toEqual({ bPct: 70, tie: false, aWin: false, bWin: true }));
  it('동률', () => expect(pollBar(50)).toEqual({ bPct: 50, tie: true, aWin: false, bWin: false }));
});

describe('sideColors', () => {
  it('우세: 라벨 잉크 + 퍼센트 로즈', () => expect(sideColors(true, false)).toEqual({ label: colors.ink, pct: colors.rose }));
  it('열세: 전체 그레이', () => expect(sideColors(false, false)).toEqual({ label: colors.sub, pct: colors.sub }));
  it('동률: 라벨 그레이 + 퍼센트 잉크', () => expect(sideColors(false, true)).toEqual({ label: colors.sub, pct: colors.ink }));
});

describe('segColor', () => {
  it('우세 로즈', () => expect(segColor(true)).toBe(colors.rose));
  it('열세 뉴트럴', () => expect(segColor(false)).toBe(colors.neutralBar));
});

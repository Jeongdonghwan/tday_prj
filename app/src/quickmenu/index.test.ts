import { QUICK_ITEMS } from './index';

describe('QUICK_ITEMS', () => {
  it('8종, key 중복 없음', () => {
    expect(QUICK_ITEMS).toHaveLength(8);
    expect(new Set(QUICK_ITEMS.map((i) => i.key)).size).toBe(8);
  });

  it('모든 항목이 라벨·아이콘 보유', () => {
    for (const i of QUICK_ITEMS) {
      expect(i.label.length).toBeGreaterThan(0);
      expect(i.xml).toContain('<svg');
    }
  });

  it('썰·후기(story) 포함, 전부 community(사진 앨범 비활성)', () => {
    expect(QUICK_ITEMS.map((i) => i.key)).toContain('story');
    expect(QUICK_ITEMS.every((i) => i.kind === 'community')).toBe(true);
  });

  it('모든 항목이 category 보유(전체=all)', () => {
    expect(QUICK_ITEMS.every((i) => !!i.category)).toBe(true);
    expect(QUICK_ITEMS.some((i) => i.category === 'all')).toBe(true);
  });
});

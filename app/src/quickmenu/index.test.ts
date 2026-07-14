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

  it('인증·사진(photo) 타일은 빠지고 썰·후기(story) 포함', () => {
    const keys = QUICK_ITEMS.map((i) => i.key);
    expect(keys).toContain('story');
    expect(QUICK_ITEMS.some((i) => i.kind === 'photo')).toBe(false);
  });

  it('community 항목은 category 보유(전체=all)', () => {
    const comm = QUICK_ITEMS.filter((i) => i.kind === 'community');
    expect(comm.every((i) => 'category' in i && !!i.category)).toBe(true);
    expect(comm.some((i) => i.category === 'all')).toBe(true);
  });
});

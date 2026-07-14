import { hasUnread } from './seen';

describe('hasUnread', () => {
  it('seen 보다 최신 알림이 있으면 true', () => {
    const items = [{ created_at: '2026-07-14T10:00:00' }];
    expect(hasUnread(items, '2026-07-14T09:00:00')).toBe(true);
  });

  it('모두 seen 이하면 false', () => {
    const items = [{ created_at: '2026-07-14T08:00:00' }];
    expect(hasUnread(items, '2026-07-14T09:00:00')).toBe(false);
  });

  it('seen 이 null 이면 알림 존재 시 true', () => {
    expect(hasUnread([{ created_at: '2026-07-14T00:00:00' }], null)).toBe(true);
  });

  it('created_at 이 null 인 항목은 무시', () => {
    expect(hasUnread([{ created_at: null }], null)).toBe(false);
  });

  it('빈 목록이면 false', () => {
    expect(hasUnread([], null)).toBe(false);
  });
});

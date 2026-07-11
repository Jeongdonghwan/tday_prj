import { AVATAR_XML, avatarFileNo, avatarXml, normalizeAvatarNo } from './index';

describe('avatar mapping', () => {
  it('avatarFileNo = user_id % 12 + 1 (1..12)', () => {
    expect(avatarFileNo(1)).toBe(2);
    expect(avatarFileNo(11)).toBe(12);
    expect(avatarFileNo(12)).toBe(1);
    expect(avatarFileNo(0)).toBe(1);
  });

  it('12종 XML 모두 존재', () => {
    for (let n = 1; n <= 12; n++) {
      expect(AVATAR_XML[n]).toContain('<svg');
    }
  });

  it('avatarXml 범위 밖/미지정은 1번으로 폴백', () => {
    expect(avatarXml(0)).toBe(AVATAR_XML[1]);
    expect(avatarXml(99)).toBe(AVATAR_XML[1]);
    expect(avatarXml(null)).toBe(AVATAR_XML[1]);
    expect(avatarXml(6)).toBe(AVATAR_XML[6]);
  });

  it('normalizeAvatarNo', () => {
    expect(normalizeAvatarNo(7)).toBe(7);
    expect(normalizeAvatarNo(undefined)).toBe(1);
    expect(normalizeAvatarNo(13)).toBe(1);
  });
});

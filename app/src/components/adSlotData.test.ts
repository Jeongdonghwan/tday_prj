import { adSize, fetchAd, _resetAdCache } from './adSlotData';
import * as adsApi from '@/api/ads';

jest.mock('@/api/ads', () => ({ getAd: jest.fn() }));
const getAd = adsApi.getAd as jest.Mock;

describe('adSize', () => {
  it('web_rail 300×100', () => expect(adSize('web_rail')).toEqual({ width: 300, height: 100 }));
  it('web_wing 240×600', () => {
    expect(adSize('web_wing_l')).toEqual({ width: 240, height: 600 });
    expect(adSize('web_wing_r')).toEqual({ width: 240, height: 600 });
  });
  it('feed_native/issue_bottom 는 가변(null)', () => {
    expect(adSize('feed_native')).toBeNull();
    expect(adSize('issue_bottom')).toBeNull();
  });
});

describe('fetchAd 캐시', () => {
  beforeEach(() => { _resetAdCache(); getAd.mockReset(); });

  it('포지션당 1회만 조회(캐시)', async () => {
    getAd.mockResolvedValue({ ad: { id: 1, image: 'i', link_url: 'l' } });
    const a = await fetchAd('feed_native');
    const b = await fetchAd('feed_native');
    expect(a).toEqual({ id: 1, image: 'i', link_url: 'l' });
    expect(b).toBe(a);
    expect(getAd).toHaveBeenCalledTimes(1);
  });

  it('조회 실패 시 null', async () => {
    getAd.mockRejectedValue(new Error('net'));
    expect(await fetchAd('web_rail')).toBeNull();
  });
});

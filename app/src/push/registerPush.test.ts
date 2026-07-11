import { updateMe } from '@/api/auth';
import { registerForPush } from './registerPush';

jest.mock('@/api/auth', () => ({ updateMe: jest.fn(async () => ({})) }));

describe('registerForPush', () => {
  it('권한 허용 시 Expo 토큰을 /me 에 저장', async () => {
    await registerForPush('jwt-token');
    expect(updateMe).toHaveBeenCalledWith({ push_token: 'ExponentPushToken[test]' }, 'jwt-token');
  });
});

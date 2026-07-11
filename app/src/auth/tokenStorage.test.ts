import * as SecureStore from 'expo-secure-store';

import { deleteToken, getToken, setToken } from './tokenStorage';

// jest-expo: Platform.OS = 'ios' → SecureStore 경로
describe('tokenStorage (native)', () => {
  it('set/get/delete 가 SecureStore 로 위임', async () => {
    await setToken('k', 'v');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('k', 'v');

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('v');
    expect(await getToken('k')).toBe('v');

    await deleteToken('k');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('k');
  });
});

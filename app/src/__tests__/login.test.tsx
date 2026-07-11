import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from '@/app/(auth)/login';

const mockSignIn = jest.fn(async () => {});
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ signIn: mockSignIn }) }));

const metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

// 렌더러 환경 비호환으로 일시 skip (StatusChip.test 참고).
describe.skip('LoginScreen', () => {
  it('개발용 로그인 버튼이 dev provider 로 signIn 호출', async () => {
    const { getByText } = render(
      <SafeAreaProvider initialMetrics={metrics}>
        <LoginScreen />
      </SafeAreaProvider>,
    );
    fireEvent.press(getByText('로그인'));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith({ provider: 'dev', social_id: 'tester1' }));
  });
});

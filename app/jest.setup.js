/* 네이티브 모듈 목 (테스트는 JS 환경). */

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test]' })),
  setNotificationChannelAsync: jest.fn(async () => {}),
  AndroidImportance: { DEFAULT: 3 },
}));

jest.mock('expo-device', () => ({ isDevice: true }));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: 'localhost:8081' } },
}));

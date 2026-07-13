/**
 * 반응형 브레이크포인트 (Task 4-1). 데스크톱 = 웹 플랫폼 + 폭 ≥1240px.
 * 그 미만(모바일 웹 포함)은 기존 모바일 레이아웃 그대로.
 */
import { Platform, useWindowDimensions } from 'react-native';

export const DESKTOP_MIN_WIDTH = 1240;

export function useIsDesktop() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
}

/** 골드 스코어 링 (프로토타입 SVG stroke-dasharray 방식). score 0~100 → 채움 비율. */
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { night } from '@/fortune/theme';

export function ScoreRing({
  size = 96,
  stroke = 7,
  score,
  children,
  dashed = false,
}: {
  size?: number;
  stroke?: number;
  score: number; // 0~100
  children?: React.ReactNode;
  dashed?: boolean; // 미등록 점선 링
}) {
  const r = size / 2 - stroke;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  const c = size / 2;
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={c} cy={c} r={r} stroke="rgba(255,255,255,0.16)" strokeWidth={stroke} fill="none"
          strokeDasharray={dashed ? '4 6' : undefined} />
        {!dashed && (
          <Circle cx={c} cy={c} r={r} stroke={night.gold} strokeWidth={stroke} fill="none"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        {children}
      </View>
    </View>
  );
}

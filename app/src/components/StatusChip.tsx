/**
 * 상태칩 — 모든 글·댓글·프로필 옆 세그먼트 라벨 (스펙 §4).
 * 도트 + 텍스트 pill. 커플=rose / 돌싱=blue / 유부=navy.
 */
import { StyleSheet, Text, View } from 'react-native';

import { radius, statusTheme, weight, type RelationshipStatus } from '@/theme';

type Props = {
  status: RelationshipStatus;
  /** 작은 변형 (댓글 등) */
  small?: boolean;
};

export function StatusChip({ status, small }: Props) {
  const s = statusTheme[status];
  return (
    <View style={[styles.chip, { backgroundColor: s.bg }, small && styles.chipSmall]}>
      <View style={[styles.dot, { backgroundColor: s.fg }]} />
      <Text style={[styles.label, { color: s.fg }, small && styles.labelSmall]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2.5,
    paddingLeft: 7,
    paddingRight: 8,
    borderRadius: radius.chip,
    alignSelf: 'flex-start',
  },
  chipSmall: { transform: [{ scale: 0.9 }] },
  dot: { width: 5, height: 5, borderRadius: 999 },
  label: { fontSize: 11, fontWeight: weight.bold as '700' },
  labelSmall: { fontSize: 10.5 },
});

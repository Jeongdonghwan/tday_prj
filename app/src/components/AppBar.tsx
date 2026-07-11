/** 상단 앱바 — 좌측 타이틀(브랜드) + 우측 액션 아이콘들 (목업 .appbar). */
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, weight } from '@/theme';

export function AppBar({
  title,
  brand,
  right,
  style,
}: {
  title: string;
  /** 브랜드형(큰 글씨)인지 */
  brand?: boolean;
  right?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.bar, style]}>
      <Text style={[styles.title, brand && styles.brand]}>{title}</Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  title: { fontSize: 18, fontWeight: weight.extrabold as '800', color: colors.ink, letterSpacing: -0.5 },
  brand: { fontSize: 21, letterSpacing: -0.8 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});

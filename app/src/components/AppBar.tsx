/** 상단 앱바 — (뒤로) + 좌측 타이틀 + 우측 액션 아이콘들. */
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, weight } from '@/theme';

export function AppBar({
  title,
  brand,
  right,
  onBack,
  style,
}: {
  title: string;
  /** 브랜드형(큰 글씨)인지 */
  brand?: boolean;
  right?: React.ReactNode;
  /** 지정 시 좌측에 뒤로가기 표시 */
  onBack?: () => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.bar, style]}>
      <View style={styles.left}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={8}>
            <Icon name="back" size={24} color={colors.ink} strokeWidth={1.9} />
          </Pressable>
        )}
        <Text style={[styles.title, brand && styles.brand]}>{title}</Text>
      </View>
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
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: weight.extrabold as '800', color: colors.ink, letterSpacing: -0.5 },
  brand: { fontSize: 21, letterSpacing: -0.8 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});

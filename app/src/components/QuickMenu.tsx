/** 홈 퀵메뉴 그리드 4×2 (HOME_UPDATE §2-2). 48px 아이콘 + 라벨, 프레스 스케일 .96. */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';

import { QUICK_ITEMS, type QuickItem } from '@/quickmenu';
import { colors, weight } from '@/theme';

export function QuickMenu() {
  const router = useRouter();

  const go = (item: QuickItem) => {
    if (item.kind === 'tests') {
      router.push('/tests');
    } else {
      router.push({ pathname: '/community', params: { category: item.category } });
    }
  };

  return (
    <View style={styles.grid}>
      {QUICK_ITEMS.map((item) => (
        <Pressable
          key={item.key}
          style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
          onPress={() => go(item)}>
          <SvgXml xml={item.xml} width={48} height={48} />
          <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cell: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  label: { fontSize: 11.5, fontWeight: weight.semibold as '600', color: colors.ink, marginTop: 6 },
});

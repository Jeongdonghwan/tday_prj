/** 가로 스크롤 필터칩 행 (목업 .filters). 선택 칩은 ink 배경. */
import { ScrollView, StyleSheet, Text, Pressable } from 'react-native';

import { colors, radius, weight } from '@/theme';

export function FilterRow({
  items,
  value,
  onChange,
}: {
  items: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.label, on && styles.labelOn]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // flexGrow:0 + alignItems:center → 웹(react-native-web)에서 가로 스크롤이 세로로 늘어나는 것 방지
  scroll: { flexGrow: 0 },
  row: { gap: 7, paddingHorizontal: 20, paddingBottom: 14, alignItems: 'center' },
  chip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: radius.chip, backgroundColor: colors.soft },
  chipOn: { backgroundColor: colors.ink },
  label: { fontSize: 13, fontWeight: weight.semibold as '600', color: colors.sub },
  labelOn: { color: '#fff' },
});

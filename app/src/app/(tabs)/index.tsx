/** 홈 탭 (IA 개편). 3b에서 오늘의 질문·퀵메뉴·인기글 TOP5·이슈 프리뷰를 조립. */
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/BrandLogo';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BrandLogo height={22} />
        <View style={styles.actions}>
          <Icon name="search" size={22} color={colors.ink} />
          <Icon name="bell" size={22} color={colors.ink} />
        </View>
      </View>
      <ScrollView style={styles.body} contentContainerStyle={{ paddingTop: 4, paddingBottom: 28 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  body: { flex: 1, backgroundColor: colors.soft },
});

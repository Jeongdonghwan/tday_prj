/** 연애이슈 탭 (IA 개편). 오늘 이슈 풀카드 + 지난 이슈 아카이브(3c에서 추가). */
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBar } from '@/components/AppBar';
import { IssueCard } from '@/components/IssueCard';
import { colors } from '@/theme';

export default function IssuesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar title="연애이슈" />
      <ScrollView style={styles.body} contentContainerStyle={{ paddingTop: 4, paddingBottom: 28 }}>
        <IssueCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, backgroundColor: colors.soft },
});

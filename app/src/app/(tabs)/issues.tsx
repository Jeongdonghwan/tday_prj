/** 연애이슈 탭 (HOME_UPDATE §3): 오늘 이슈 풀카드 + 지난 이슈 아카이브. */
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getIssueArchive, type IssueArchiveItem } from '@/api/issues';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { IssueCard } from '@/components/IssueCard';
import { colors, weight } from '@/theme';

export default function IssuesScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [archive, setArchive] = useState<IssueArchiveItem[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setArchive((await getIssueArchive(token)).items);
    } catch {
      setArchive([]);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar title="연애이슈" />
      <ScrollView style={styles.body} contentContainerStyle={{ paddingTop: 4, paddingBottom: 28 }}>
        <IssueCard />

        {archive.length > 0 && (
          <View style={styles.archive}>
            <Text style={styles.archiveTitle}>지난 이슈</Text>
            {archive.map((it) => {
              const aWin = it.a_pct >= 50;
              return (
                <Pressable
                  key={it.id}
                  style={styles.row}
                  onPress={() => router.push({ pathname: '/issue/[id]', params: { id: it.id } })}>
                  <View style={styles.rowTop}>
                    <Text style={styles.date}>{it.date}</Text>
                    <Text style={styles.cmt}>댓글 {it.comment_count}</Text>
                  </View>
                  <Text style={styles.title} numberOfLines={1}>{it.title}</Text>
                  <View style={styles.barRow}>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${it.a_pct}%`, backgroundColor: aWin ? colors.rose : colors.blue }]} />
                    </View>
                    <Text style={[styles.result, { color: aWin ? colors.rose : colors.blue }]}>
                      {aWin ? it.a_label : it.b_label} {aWin ? it.a_pct : 100 - it.a_pct}%
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, backgroundColor: colors.soft },
  archive: { marginHorizontal: 16, marginTop: 6 },
  archiveTitle: { fontSize: 13, fontWeight: weight.extrabold as '800', color: colors.sub, marginBottom: 8, marginLeft: 4 },
  row: { backgroundColor: colors.bg, borderWidth: 0.5, borderColor: colors.line, borderRadius: 14, padding: 14, marginBottom: 8 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  date: { fontSize: 11.5, color: colors.sub2, fontWeight: weight.semibold as '600' },
  cmt: { fontSize: 11.5, color: colors.sub, fontWeight: weight.semibold as '600' },
  title: { fontSize: 14, fontWeight: weight.semibold as '600', color: colors.ink, marginTop: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  track: { flex: 1, height: 6, borderRadius: 4, backgroundColor: '#F2F3F5', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  result: { fontSize: 11.5, fontWeight: weight.bold as '700' },
});

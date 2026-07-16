/** 연애이슈 탭 (HOME_UPDATE §3): 오늘 이슈 풀카드 + 지난 이슈 아카이브. */
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getIssueArchive, type IssueArchiveItem } from '@/api/issues';
import { useAuth } from '@/auth/AuthContext';
import { AdSlot } from '@/components/AdSlot';
import { AppBar } from '@/components/AppBar';
import { IssueCard, issueThumb } from '@/components/IssueCard';
import { useIsDesktop } from '@/hooks/useResponsive';
import { colors, weight } from '@/theme';

export default function IssuesScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [archive, setArchive] = useState<IssueArchiveItem[]>([]);

  const load = useCallback(async () => {
    // 게스트도 열람 가능 (아카이브는 공개 API)
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
      {!isDesktop && <AppBar title="연애이슈" />}
      <ScrollView style={styles.body} contentContainerStyle={{ paddingTop: 4, paddingBottom: 28 }}>
        <IssueCard />
        <AdSlot position="issue_bottom" />

        {archive.length > 0 && (
          <View style={styles.archive}>
            <Text style={styles.archiveTitle}>지난 이슈</Text>
            {archive.map((it) => (
              <Pressable
                key={it.id}
                style={styles.row}
                onPress={() => router.push({ pathname: '/issue/[id]', params: { id: it.id } })}>
                <Image source={{ uri: issueThumb(it.id) }} style={styles.thumb} />
                <View style={styles.rowBody}>
                  <Text style={styles.title} numberOfLines={2}>{it.title}</Text>
                  <View style={styles.rowMeta}>
                    <Text style={styles.date}>{it.date}</Text>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.cmt}>댓글 {it.comment_count}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bg, borderWidth: 0.5, borderColor: colors.line, borderRadius: 14, padding: 12, marginBottom: 8 },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.soft },
  rowBody: { flex: 1, gap: 6, justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: weight.semibold as '600', color: colors.ink, lineHeight: 20 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontSize: 11.5, color: colors.sub2, fontWeight: weight.semibold as '600' },
  dot: { fontSize: 11.5, color: colors.sub2 },
  cmt: { fontSize: 11.5, color: colors.sub, fontWeight: weight.semibold as '600' },
});

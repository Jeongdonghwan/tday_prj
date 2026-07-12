/** 홈 탭 (HOME_UPDATE §2): 오늘의 질문 + 퀵메뉴 + 인기글 TOP5 + 이슈 프리뷰. */
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTrending, type TrendingItem } from '@/api/home';
import { getTodayIssue, type Issue } from '@/api/issues';
import { useAuth } from '@/auth/AuthContext';
import { BrandLogo } from '@/components/BrandLogo';
import { DailyPollCard } from '@/components/DailyPollCard';
import { Icon } from '@/components/Icon';
import { QuickMenu } from '@/components/QuickMenu';
import { colors, weight } from '@/theme';

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
      <ScrollView style={styles.body} contentContainerStyle={{ paddingTop: 4, paddingBottom: 28 }}>
        <DailyPollCard />
        <View style={styles.qmCard}>
          <QuickMenu />
        </View>
        <TrendingSection />
        <IssuePreview />
      </ScrollView>
    </SafeAreaView>
  );
}

function TrendingSection() {
  const { token } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<TrendingItem[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setItems((await getTrending(token)).items);
    } catch {
      setItems([]);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!items.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.secHead}>
        <Text style={styles.secTitle}>지금 뜨는 글</Text>
        <Pressable onPress={() => router.push('/community')} hitSlop={6}>
          <Text style={styles.more}>더보기</Text>
        </Pressable>
      </View>
      {items.map((p, i) => (
        <Pressable key={p.id} style={styles.rank} onPress={() => router.push(`/post/${p.id}`)}>
          <Text style={styles.rankNum}>{i + 1}</Text>
          <Text style={styles.rankTitle} numberOfLines={1}>{p.title}</Text>
          <Text style={styles.rankCmt}>댓글 {p.comment_count}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function IssuePreview() {
  const { token } = useAuth();
  const router = useRouter();
  const [issue, setIssue] = useState<Issue | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setIssue((await getTodayIssue(token)).issue);
    } catch {
      setIssue(null);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!issue) return null;

  return (
    <Pressable style={styles.card} onPress={() => router.push('/issues')}>
      <Text style={styles.previewLabel}>오늘의 연애이슈</Text>
      <Text style={styles.previewTitle} numberOfLines={2}>{issue.title}</Text>
      <Text style={styles.previewMeta}>투표 참여 {issue.poll.total.toLocaleString()}명</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  body: { flex: 1, backgroundColor: colors.soft },
  card: {
    backgroundColor: colors.bg,
    borderWidth: 0.5,
    borderColor: colors.line,
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  qmCard: {
    backgroundColor: colors.bg,
    borderWidth: 0.5,
    borderColor: colors.line,
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  secTitle: { fontSize: 15, fontWeight: weight.extrabold as '800', color: colors.ink },
  more: { fontSize: 12, color: colors.sub, fontWeight: weight.semibold as '600' },
  rank: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rankNum: { fontSize: 15, fontWeight: weight.bold as '700', color: colors.rose, width: 16 },
  rankTitle: { flex: 1, fontSize: 14, fontWeight: weight.semibold as '600', color: colors.ink },
  rankCmt: { fontSize: 11.5, color: colors.sub, fontWeight: weight.semibold as '600' },
  previewLabel: { fontSize: 11.5, fontWeight: weight.bold as '700', color: colors.sub },
  previewTitle: { fontSize: 14, fontWeight: weight.semibold as '600', color: colors.ink, lineHeight: 21, marginTop: 8 },
  previewMeta: { fontSize: 12, color: colors.rose, fontWeight: weight.bold as '700', marginTop: 8 },
});

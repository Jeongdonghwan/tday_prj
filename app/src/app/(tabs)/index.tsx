/** 홈 탭 (HOME_UPDATE §2): 오늘의 질문 + 퀵메뉴 + 지금 뜨는 글 + 연애이슈. */
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { bestPosts } from '@/api/best';
import { getTrending, type TrendingItem } from '@/api/home';
import { getIssueArchive, getTodayIssue } from '@/api/issues';
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
        <HotSection />
        <IssueSection />
      </ScrollView>
    </SafeAreaView>
  );
}

/** 지금 뜨는 글 — 최근 24h 인기(trending). 비면 주간 BEST 로 폴백해 항상 노출. */
function HotSection() {
  const { token } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<TrendingItem[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      // 최근 24h 트렌딩 우선, 부족분은 실시간 베스트(hot_score)로 보충해 항상 5줄 채움
      const [trendRes, bestRes] = await Promise.all([
        getTrending(token),
        bestPosts('realtime', undefined, token),
      ]);
      const list = [...trendRes.items];
      const seen = new Set(list.map((p) => p.id));
      for (const p of bestRes.items) {
        if (list.length >= 5) break;
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        list.push({ id: p.id, title: p.title, comment_count: p.comment_count });
      }
      setItems(list.slice(0, 5));
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
        <Pressable onPress={() => router.navigate('/best')} hitSlop={6}>
          <Text style={styles.more}>더보기</Text>
        </Pressable>
      </View>
      {items.map((p, i) => (
        <Pressable
          key={p.id}
          style={styles.rank}
          onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })}>
          <Text style={styles.rankNum}>{i + 1}</Text>
          <Text style={styles.rankTitle} numberOfLines={1}>{p.title}</Text>
          <Text style={styles.rankCmt}>댓글 {p.comment_count}</Text>
        </Pressable>
      ))}
    </View>
  );
}

type IssueRow = { id: number; title: string; total: number; tag: string };

/** 연애이슈 — 운영자 큐레이션(오늘 + 지난 이슈). 여러 건을 리스트로 프리뷰. */
function IssueSection() {
  const { token } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<IssueRow[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [todayRes, archiveRes] = await Promise.all([getTodayIssue(token), getIssueArchive(token)]);
      const list: IssueRow[] = [];
      if (todayRes.issue) {
        list.push({ id: todayRes.issue.id, title: todayRes.issue.title, total: todayRes.issue.poll.total, tag: 'HOT' });
      }
      for (const a of archiveRes.items) {
        list.push({ id: a.id, title: a.title, total: a.total, tag: a.date });
      }
      setRows(list.slice(0, 4));
    } catch {
      setRows([]);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!rows.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.secHead}>
        <Text style={styles.secTitle}>연애이슈</Text>
        <Pressable onPress={() => router.navigate('/issues')} hitSlop={6}>
          <Text style={styles.more}>더보기</Text>
        </Pressable>
      </View>
      {rows.map((it) => {
        const hot = it.tag === 'HOT';
        return (
          <Pressable
            key={it.id}
            style={styles.issue}
            onPress={() => router.push({ pathname: '/issue/[id]', params: { id: it.id } })}>
            <View style={[styles.tag, hot ? styles.tagHot : styles.tagDate]}>
              <Text style={[styles.tagText, hot ? styles.tagTextHot : styles.tagTextDate]}>{it.tag}</Text>
            </View>
            <View style={styles.issueBody}>
              <Text style={styles.issueTitle} numberOfLines={1}>{it.title}</Text>
              <Text style={styles.issueMeta}>투표 참여 {it.total.toLocaleString()}명</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
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
  issue: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  tag: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4, minWidth: 46, alignItems: 'center' },
  tagHot: { backgroundColor: colors.roseBg },
  tagDate: { backgroundColor: colors.soft },
  tagText: { fontSize: 10.5, fontWeight: weight.bold as '700' },
  tagTextHot: { color: colors.rose },
  tagTextDate: { color: colors.sub },
  issueBody: { flex: 1, gap: 3 },
  issueTitle: { fontSize: 14, fontWeight: weight.semibold as '600', color: colors.ink },
  issueMeta: { fontSize: 11.5, color: colors.sub, fontWeight: weight.semibold as '600' },
});

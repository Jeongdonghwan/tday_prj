/** 홈 탭 (HOME_UPDATE §2): 오늘의 질문 + 퀵메뉴 + 지금 뜨는 글 + 연애이슈. */
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Image } from 'react-native';

import { bestPosts } from '@/api/best';
import { getTrending, type TrendingItem } from '@/api/home';
import { getIssueArchive, getTodayIssue } from '@/api/issues';
import { getTests, type TestListItem } from '@/api/tests';
import { useAuth } from '@/auth/AuthContext';
import { BrandLogo } from '@/components/BrandLogo';
import { DailyPollCard } from '@/components/DailyPollCard';
import { Icon } from '@/components/Icon';
import { issueThumb } from '@/components/IssueCard';
import { NotificationBell } from '@/components/NotificationBell';
import { QuickMenu } from '@/components/QuickMenu';
import { useIsDesktop } from '@/hooks/useResponsive';
import { colors, weight } from '@/theme';

export default function HomeScreen() {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 데스크톱은 상단 GNB가 로고/검색/알림 제공 → 자체 헤더 미노출(중복 제거) */}
      {!isDesktop && (
        <View style={styles.header}>
          <BrandLogo height={22} />
          <View style={styles.actions}>
            <Pressable onPress={() => router.push('/search')} hitSlop={8}>
              <Icon name="search" size={22} color={colors.ink} />
            </Pressable>
            <NotificationBell />
          </View>
        </View>
      )}
      <ScrollView style={styles.body} contentContainerStyle={{ paddingTop: 4, paddingBottom: 28 }}>
        <DailyPollCard />
        <View style={styles.qmCard}>
          <QuickMenu />
        </View>
        <HotSection />
        <IssueSection />
        <TestSection />
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

type IssueRow = { id: number; title: string; meta: string; hot: boolean };

/** 연애이슈 — 운영자 큐레이션 뉴스/칼럼(오늘 + 지난). 썸네일+헤드라인 뉴스 리스트 프리뷰. */
function IssueSection() {
  const { token } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<IssueRow[]>([]);

  const load = useCallback(async () => {
    try {
      const [todayRes, archiveRes] = await Promise.all([getTodayIssue(token), getIssueArchive(token)]);
      const list: IssueRow[] = [];
      if (todayRes.issue) {
        list.push({ id: todayRes.issue.id, title: todayRes.issue.title, meta: todayRes.issue.source ?? '오늘의 이슈', hot: true });
      }
      for (const a of archiveRes.items) {
        list.push({ id: a.id, title: a.title, meta: a.date, hot: false });
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
      {rows.map((it) => (
        <Pressable
          key={it.id}
          style={styles.issue}
          onPress={() => router.push({ pathname: '/issue/[id]', params: { id: it.id } })}>
          <Image source={{ uri: issueThumb(it.id) }} style={styles.issueThumb} />
          <View style={styles.issueBody}>
            <Text style={styles.issueTitle} numberOfLines={2}>{it.title}</Text>
            <View style={styles.issueMetaRow}>
              {it.hot ? (
                <View style={styles.hotTag}><Text style={styles.hotTagText}>NEW</Text></View>
              ) : null}
              <Text style={styles.issueMeta}>{it.meta}</Text>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

/** 연애 심리테스트 — 홈에서 바로 진입(오늘의 질문/연애이슈처럼 하단 섹션). */
function TestSection() {
  const { token } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<TestListItem[]>([]);

  const load = useCallback(async () => {
    try {
      setItems((await getTests(token)).items);
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
        <Text style={styles.secTitle}>연애 심리테스트</Text>
        <Pressable onPress={() => router.push('/tests')} hitSlop={6}>
          <Text style={styles.more}>더보기</Text>
        </Pressable>
      </View>
      {items.slice(0, 4).map((t) => (
        <Pressable
          key={t.slug}
          style={styles.testRow}
          onPress={() => router.push({ pathname: '/tests', params: { slug: t.slug } })}>
          <Text style={styles.testEmoji}>{t.emoji}</Text>
          <Text style={styles.testTitle} numberOfLines={1}>{t.title}</Text>
          <Text style={styles.testGo}>›</Text>
        </Pressable>
      ))}
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
  issueThumb: { width: 68, height: 68, borderRadius: 12, backgroundColor: colors.soft },
  issueBody: { flex: 1, gap: 5, justifyContent: 'center' },
  issueTitle: { fontSize: 14, fontWeight: weight.semibold as '600', color: colors.ink, lineHeight: 20 },
  issueMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hotTag: { backgroundColor: colors.roseBg, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  hotTagText: { fontSize: 9.5, fontWeight: weight.bold as '700', color: colors.rose },
  issueMeta: { fontSize: 11.5, color: colors.sub, fontWeight: weight.semibold as '600' },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  testEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  testTitle: { flex: 1, fontSize: 14, fontWeight: weight.semibold as '600', color: colors.ink },
  testGo: { fontSize: 18, color: colors.sub2, fontWeight: weight.bold as '700' },
});

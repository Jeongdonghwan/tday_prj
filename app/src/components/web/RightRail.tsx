/**
 * 데스크톱 우측 레일 위젯 (Task 4-1, 280px).
 * ① 오늘의 질문(홈 외 화면) ② 실시간 인기 TOP5 ③ 지난 연애이슈 3건 ④ 광고 배너 placeholder.
 * 위젯 데이터는 기존 API 재사용 (dailyPoll / home trending / issues archive).
 */
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, usePathname, useRouter } from 'expo-router';

import { getTrending, type TrendingItem } from '@/api/home';
import { getIssueArchive, type IssueArchiveItem } from '@/api/issues';
import { useAuth } from '@/auth/AuthContext';
import { AdSlot } from '@/components/AdSlot';
import { DailyPollCard } from '@/components/DailyPollCard';
import { colors, weight } from '@/theme';

export function RightRail() {
  const { token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/' || pathname === '/index';

  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [archive, setArchive] = useState<IssueArchiveItem[]>([]);

  const load = useCallback(async () => {
    // 게스트도 열람 가능 (트렌딩·이슈 아카이브는 공개 API)
    try {
      setTrending((await getTrending(token)).items);
    } catch {
      setTrending([]);
    }
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
    <View style={styles.rail}>
      {/* 오늘의 질문 — 홈은 본문에 이미 있으므로 레일에선 홈 외 화면만 */}
      {!isHome && (
        <View style={styles.pollWrap}>
          <DailyPollCard />
        </View>
      )}

      {trending.length > 0 && (
        <View style={styles.widget}>
          <Text style={styles.wtitle}>실시간 인기 TOP5</Text>
          {trending.slice(0, 5).map((it, i) => (
            <Pressable
              key={it.id}
              style={styles.row}
              onPress={() => router.push({ pathname: '/post/[id]', params: { id: it.id } })}>
              <Text style={styles.rank}>{i + 1}</Text>
              <Text style={styles.rowTitle} numberOfLines={1}>{it.title}</Text>
              <Text style={styles.rowCmt}>{it.comment_count}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {archive.length > 0 && (
        <View style={styles.widget}>
          <Text style={styles.wtitle}>지난 연애이슈</Text>
          {archive.slice(0, 3).map((it) => (
            <Pressable
              key={it.id}
              style={styles.issueRow}
              onPress={() => router.push({ pathname: '/issue/[id]', params: { id: it.id } })}>
              <Text style={styles.issueDate}>{it.date}</Text>
              <Text style={styles.rowTitle} numberOfLines={1}>{it.title}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* 광고 슬롯 (활성 없으면 아무것도 안 그림) */}
      <View style={styles.adWrap}>
        <AdSlot position="web_rail" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { width: 280, paddingTop: 12, gap: 12 },
  pollWrap: { marginHorizontal: -16 }, // DailyPollCard 자체 marginHorizontal 16 상쇄
  widget: {
    backgroundColor: colors.bg,
    borderWidth: 0.5,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 14,
  },
  wtitle: { fontSize: 13, fontWeight: weight.extrabold as '800', color: colors.ink, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  rank: { width: 16, fontSize: 13, fontWeight: weight.bold as '700', color: colors.rose },
  rowTitle: { flex: 1, fontSize: 12.5, fontWeight: weight.semibold as '600', color: colors.body },
  rowCmt: { fontSize: 11, color: colors.sub, fontWeight: weight.semibold as '600' },
  issueRow: { paddingVertical: 6, gap: 2 },
  issueDate: { fontSize: 10.5, color: colors.sub2, fontWeight: weight.semibold as '600' },
  adWrap: { alignItems: 'center' },
});

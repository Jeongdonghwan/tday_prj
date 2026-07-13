/** BEST — 인기글·베스트 댓글 (스펙 §5-4). API 연동: 기간·카테고리 필터. */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { bestComments, bestPosts, type BestComment, type BestPeriod } from '@/api/best';
import type { ApiPost } from '@/api/posts';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { FilterRow } from '@/components/FilterRow';
import { Icon } from '@/components/Icon';
import { CATEGORY_FILTERS } from '@/data/placeholders';
import { useIsDesktop } from '@/hooks/useResponsive';
import { colors, radius, weight } from '@/theme';

const PERIODS: { key: BestPeriod; label: string }[] = [
  { key: 'realtime', label: '실시간' },
  { key: 'today', label: '오늘' },
  { key: 'weekly', label: '주간' },
];

export default function BestScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const isDesktop = useIsDesktop();
  const [cat, setCat] = useState('all');
  const [period, setPeriod] = useState<BestPeriod>('realtime');
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [comments, setComments] = useState<BestComment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([bestPosts(period, cat, token), bestComments(token)]);
      setPosts(p.items);
      setComments(c.items);
    } catch {
      setPosts([]);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [period, cat, token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {!isDesktop && (
        <AppBar
          title="BEST"
          brand
          right={
            <Pressable onPress={() => router.push('/search')} hitSlop={8}>
              <Icon name="search" size={22} color={colors.ink} />
            </Pressable>
          }
        />
      )}
      <FilterRow items={CATEGORY_FILTERS} value={cat} onChange={setCat} />
      <View style={styles.period}>
        {PERIODS.map((p) => {
          const on = p.key === period;
          return (
            <Pressable key={p.key} onPress={() => setPeriod(p.key)} style={[styles.pchip, on && styles.pchipOn]}>
              <Text style={[styles.plabel, on && styles.plabelOn]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
        {loading ? (
          <ActivityIndicator color={colors.rose} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.shead}>
                <Text style={styles.stitle}>인기글</Text>
              </View>
              {posts.length === 0 ? (
                <Text style={styles.empty}>아직 집계된 인기글이 없어요.</Text>
              ) : (
                posts.slice(0, 10).map((p, i) => (
                  <Pressable key={p.id} style={styles.rank} onPress={() => router.push(`/post/${p.id}`)}>
                    <Text style={[styles.num, i > 2 && { color: colors.sub2 }]}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rtitle}>{p.title}</Text>
                      <Text style={styles.rstat}>
                        {p.is_poll ? `투표 ${p.poll?.total.toLocaleString()} · ` : ''}
                        댓글 {p.comment_count} · 공감 {p.like_count.toLocaleString()}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>

            <View style={[styles.section, styles.sectionGap]}>
              <View style={styles.shead}>
                <Text style={styles.stitle}>베스트 댓글</Text>
              </View>
              {comments.length === 0 ? (
                <Text style={styles.empty}>아직 베스트 댓글이 없어요.</Text>
              ) : (
                comments.slice(0, 10).map((c) => (
                  <Pressable key={c.id} style={styles.bcmt} onPress={() => router.push(`/post/${c.post_id}`)}>
                    <Text style={styles.bctx}>&ldquo;{c.body}&rdquo;</Text>
                    <Text style={styles.bcfrom}>
                      {c.author.nickname} · &lsquo;{c.post_title.slice(0, 14)}…&rsquo; 글에서
                    </Text>
                    <View style={styles.bcmeta}>
                      <Icon name="heart" size={13} color={colors.rose} />
                      <Text style={styles.bclike}>공감 {c.like_count}</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  period: { flexDirection: 'row', gap: 7, paddingHorizontal: 20, paddingBottom: 14 },
  pchip: { paddingVertical: 7, paddingHorizontal: 15, borderRadius: radius.chip, backgroundColor: colors.soft },
  pchipOn: { backgroundColor: colors.roseBg },
  plabel: { fontSize: 13, fontWeight: weight.bold as '700', color: colors.sub },
  plabelOn: { color: colors.rose },
  body: { flex: 1, borderTopWidth: 1, borderTopColor: colors.line },
  section: { paddingHorizontal: 20, paddingTop: 18 },
  sectionGap: { borderTopWidth: 8, borderTopColor: colors.soft, marginTop: 18 },
  shead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  stitle: { fontSize: 15, fontWeight: weight.extrabold as '800', color: colors.ink },
  empty: { fontSize: 13, color: colors.sub2, paddingVertical: 18, textAlign: 'center' },
  rank: { flexDirection: 'row', gap: 13, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
  num: { fontSize: 17, fontWeight: weight.extrabold as '800', color: colors.rose, width: 18 },
  rtitle: { fontSize: 14.5, fontWeight: weight.semibold as '600', color: colors.ink, lineHeight: 20 },
  rstat: { fontSize: 11.5, color: colors.sub, fontWeight: weight.semibold as '600', marginTop: 7 },
  bcmt: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
  bctx: { fontSize: 14, fontWeight: weight.semibold as '600', color: colors.ink, lineHeight: 20 },
  bcfrom: { fontSize: 11.5, color: colors.sub, marginTop: 7 },
  bcmeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  bclike: { fontSize: 11.5, fontWeight: weight.bold as '700', color: colors.rose },
});

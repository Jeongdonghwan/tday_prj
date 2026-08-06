/** 커뮤니티 탭 — 오늘연애 피드 (IA 개편: 기존 홈 피드를 별도 탭으로 분리, 헤더 카드는 홈/이슈탭으로 이동). */
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { listPosts, toFeedPost } from '@/api/posts';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { FilterRow } from '@/components/FilterRow';
import { Icon } from '@/components/Icon';
import { NotificationBell } from '@/components/NotificationBell';
import { AdSlot } from '@/components/AdSlot';
import { PostCard, type FeedPost } from '@/components/PostCard';
import { CATEGORY_FILTERS } from '@/data/placeholders';
import { useIsDesktop } from '@/hooks/useResponsive';
import { colors, weight } from '@/theme';

export default function CommunityFeed() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  // 영어권 유저에게만 K-Story 모아보기 필터 노출(한국 유저에겐 없음)
  const filters =
    user?.lang === 'en' ? [{ key: 'kstory', label: t('feed.kstory') }, ...CATEGORY_FILTERS] : CATEGORY_FILTERS;
  // 퀵메뉴 등에서 category 파라미터로 진입 가능
  const params = useLocalSearchParams<{ category?: string }>();
  const [filter, setFilter] = useState(params.category ?? 'all');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const loadingMore = useRef(false);

  const load = useCallback(
    async (opts: { reset?: boolean } = {}) => {
      const reset = opts.reset ?? true;
      if (reset) setLoading(true);
      try {
        const res = await listPosts(
          filter === 'kstory'
            ? { postType: 'kstory', cursor: reset ? null : cursor, token }
            : { category: filter, cursor: reset ? null : cursor, token },
        );
        // 실제 이미지 첨부 기능 도입 전까지 목업 썸네일 미부착 (첨부 안 한 글이 이미지글로 보이던 문제)
        const mapped = res.items.map(toFeedPost);
        setPosts((prev) => (reset ? mapped : [...prev, ...mapped]));
        setCursor(res.next_cursor);
      } catch {
        if (reset) setPosts([]);
      } finally {
        setLoading(false);
      }
    },
    [filter, cursor, token],
  );

  useFocusEffect(
    useCallback(() => {
      load({ reset: true });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, token]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load({ reset: true });
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (loadingMore.current || cursor == null) return;
    loadingMore.current = true;
    await load({ reset: false });
    loadingMore.current = false;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {!isDesktop && (
        <AppBar
          title={t('community.title')}
          right={
            <>
              <Pressable onPress={() => router.push('/search')} hitSlop={8}>
                <Icon name="search" size={22} color={colors.ink} />
              </Pressable>
              <NotificationBell />
            </>
          }
        />
      )}
      <FilterRow items={filters} value={filter} onChange={setFilter} />
      <FlatList
        style={styles.list}
        data={posts}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item, index }) => (
          <>
            <PostCard post={item} onPress={() => router.push(`/post/${item.id}`)} />
            {/* 5번째 글 뒤마다 네이티브 광고 (활성 없으면 null) */}
            {(index + 1) % 5 === 0 && <AdSlot position="feed_native" />}
          </>
        )}
        contentContainerStyle={posts.length === 0 ? styles.empty : { paddingTop: 4, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.rose} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.rose} style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.emptyText}>{t('community.empty')}</Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { flex: 1, backgroundColor: colors.soft },
  empty: { flexGrow: 1, justifyContent: 'center', backgroundColor: colors.bg },
  emptyText: { textAlign: 'center', color: colors.sub, fontSize: 14, lineHeight: 22, fontWeight: weight.semibold as '600' },
});

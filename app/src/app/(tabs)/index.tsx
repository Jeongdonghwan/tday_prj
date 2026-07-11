/** 홈 — 썰전 피드 (스펙 §5-1). API 연동: 커서 무한스크롤 + 당겨서 새로고침. */
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listPosts, toFeedPost } from '@/api/posts';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { FilterRow } from '@/components/FilterRow';
import { Icon } from '@/components/Icon';
import { PostCard, type FeedPost } from '@/components/PostCard';
import { CATEGORY_FILTERS } from '@/data/placeholders';
import { colors, weight } from '@/theme';

// 목업 썸네일 (실제 이미지 업로드 전까지 placeholder, DECISIONS #5).
// §2의 3케이스가 보이도록: 투표글=없음, id%3==0 일반글=이미지글, 그 외=텍스트글.
const mockThumb = (p: FeedPost): string | undefined => {
  if (p.poll) return undefined;
  return p.id % 3 === 0 ? `https://picsum.photos/seed/sseuljeon${p.id}/200/200` : undefined;
};

export default function HomeFeed() {
  const router = useRouter();
  const { token } = useAuth();
  const [filter, setFilter] = useState('all');
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
        const res = await listPosts({ category: filter, cursor: reset ? null : cursor, token });
        const mapped = res.items.map(toFeedPost).map((p) => ({ ...p, imageUrl: mockThumb(p) }));
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

  // 탭 포커스 시(글쓰기/투표 후 복귀 포함) 최신화
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
      <AppBar
        title="썰전"
        brand
        right={
          <>
            <Icon name="search" size={22} color={colors.ink} />
            <Icon name="bell" size={22} color={colors.ink} />
          </>
        }
      />
      <FilterRow items={CATEGORY_FILTERS} value={filter} onChange={setFilter} />
      <FlatList
        style={styles.list}
        data={posts}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <PostCard post={item} onPress={() => router.push(`/post/${item.id}`)} />
        )}
        contentContainerStyle={posts.length === 0 ? styles.empty : { paddingTop: 4, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.rose} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.rose} style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.emptyText}>아직 글이 없어요.{'\n'}첫 썰을 올려보세요!</Text>
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

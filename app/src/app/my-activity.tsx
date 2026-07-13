/** 내 활동 — 내 글 / 내 댓글 목록. 상단 토글로 전환. */
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMyComments, getMyPosts, type MyComment } from '@/api/me';
import { toFeedPost, type ApiPost } from '@/api/posts';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { PostCard, type FeedPost } from '@/components/PostCard';
import { useIsDesktop } from '@/hooks/useResponsive';
import { colors, weight } from '@/theme';

type Tab = 'posts' | 'comments';

export default function MyActivityScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [comments, setComments] = useState<MyComment[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [p, c] = await Promise.all([getMyPosts(token), getMyComments(token)]);
      setPosts(p.items.map((it: ApiPost) => toFeedPost(it)));
      setComments(c.items);
    } catch {
      setPosts([]);
      setComments([]);
    } finally {
      setLoaded(true);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const empty = tab === 'posts' ? posts.length === 0 : comments.length === 0;

  return (
    <SafeAreaView style={[styles.safe, isDesktop && styles.safeDesktop]} edges={['top']}>
      <View style={[styles.col, isDesktop && styles.colDesktop]}>
        <AppBar title="내 활동" onBack={() => router.back()} />
        <View style={styles.tabs}>
          {(['posts', 'comments'] as Tab[]).map((t) => (
            <Pressable key={t} style={styles.tab} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t === 'posts' ? '내 글' : '내 댓글'}</Text>
              {tab === t && <View style={styles.tabBar} />}
            </Pressable>
          ))}
        </View>

        {tab === 'posts' ? (
          <FlatList
            data={posts}
            keyExtractor={(p) => String(p.id)}
            renderItem={({ item }) => <PostCard post={item} onPress={() => router.push(`/post/${item.id}`)} />}
            contentContainerStyle={empty ? styles.empty : { paddingTop: 4, paddingBottom: 24 }}
            ListEmptyComponent={loaded ? <Text style={styles.emptyText}>아직 쓴 글이 없어요.</Text> : null}
          />
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(c) => String(c.id)}
            renderItem={({ item }) => (
              <Pressable style={styles.crow} onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.post_id } })}>
                <Text style={styles.cbody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.cmeta}>{item.post_title} · {item.time_text}</Text>
              </Pressable>
            )}
            contentContainerStyle={empty ? styles.empty : { paddingTop: 4, paddingBottom: 24 }}
            ListEmptyComponent={loaded ? <Text style={styles.emptyText}>아직 단 댓글이 없어요.</Text> : null}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  safeDesktop: { alignItems: 'center' },
  col: { flex: 1, width: '100%' },
  colDesktop: { maxWidth: 680, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.line },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 14, fontWeight: weight.semibold as '600', color: colors.sub },
  tabTextOn: { color: colors.ink, fontWeight: weight.extrabold as '800' },
  tabBar: { position: 'absolute', bottom: -1, height: 2, width: '60%', backgroundColor: colors.ink },
  crow: { paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.line, gap: 5 },
  cbody: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  cmeta: { fontSize: 11.5, color: colors.sub, fontWeight: weight.semibold as '600' },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: colors.sub2 },
});

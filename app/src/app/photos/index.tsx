/** 인증·사진 앨범 — 사진글 2열 그리드. 탭 → 상세, + → 사진 올리기. */
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listPosts, type ApiPost } from '@/api/posts';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { Icon } from '@/components/Icon';
import { useIsDesktop } from '@/hooks/useResponsive';
import { colors, weight } from '@/theme';

export default function PhotosScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [items, setItems] = useState<ApiPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listPosts({ category: 'photo', token });
      setItems(res.items);
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={[styles.safe, isDesktop && styles.safeDesktop]} edges={['top']}>
      <View style={[styles.col, isDesktop && styles.colDesktop]}>
        <AppBar title="인증·사진" onBack={() => router.back()} />
        <FlatList
          data={items}
          key="2col"
          numColumns={2}
          keyExtractor={(p) => String(p.id)}
          columnWrapperStyle={{ gap: 8, paddingHorizontal: 12 }}
          contentContainerStyle={items.length === 0 ? styles.empty : { paddingTop: 8, paddingBottom: 24, gap: 8 }}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/post/${item.id}`)}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]} />
              )}
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.meta}>공감 {item.like_count} · 댓글 {item.comment_count}</Text>
            </Pressable>
          )}
          ListEmptyComponent={loaded ? <Text style={styles.emptyText}>첫 사진을 올려보세요!</Text> : null}
        />
        <Pressable style={styles.fab} onPress={() => router.push('/photos/new')}>
          <Icon name="plus" size={26} color="#fff" strokeWidth={2.2} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  safeDesktop: { alignItems: 'center' },
  col: { flex: 1, width: '100%' },
  colDesktop: { maxWidth: 680, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.line },
  card: { flex: 1, marginBottom: 4 },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: colors.soft },
  thumbEmpty: { borderWidth: 0.5, borderColor: colors.line },
  title: { fontSize: 13.5, fontWeight: weight.semibold as '600', color: colors.ink, marginTop: 6 },
  meta: { fontSize: 11, color: colors.sub, marginTop: 2 },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: colors.sub2 },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.rose,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.rose,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});

/** 글 검색 — 제목·본문 검색(서버 q). 상단 검색바 + 결과 피드. */
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listPosts, toFeedPost } from '@/api/posts';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { PostCard, type FeedPost } from '@/components/PostCard';
import { useIsDesktop } from '@/hooks/useResponsive';
import { colors, weight } from '@/theme';

export default function SearchScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const seq = useRef(0);

  const run = useCallback(async () => {
    const term = q.trim();
    if (!term) return;
    const my = ++seq.current;
    setLoading(true);
    setSearched(true);
    try {
      const res = await listPosts({ q: term, token });
      if (my === seq.current) setResults(res.items.map(toFeedPost));
    } catch {
      if (my === seq.current) setResults([]);
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [q, token]);

  return (
    <SafeAreaView style={[styles.safe, isDesktop && styles.safeDesktop]} edges={['top']}>
      <View style={[styles.col, isDesktop && styles.colDesktop]}>
        <View style={styles.bar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="back" size={24} color={colors.ink} strokeWidth={1.9} />
          </Pressable>
          <View style={styles.inputWrap}>
            <Icon name="search" size={18} color={colors.sub} />
            <TextInput
              style={styles.input}
              placeholder="글 제목·내용 검색"
              placeholderTextColor={colors.sub2}
              value={q}
              onChangeText={setQ}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={run}
            />
          </View>
        </View>

        <FlatList
          data={results}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => <PostCard post={item} onPress={() => router.push(`/post/${item.id}`)} />}
          contentContainerStyle={results.length === 0 ? styles.empty : { paddingTop: 4, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={colors.rose} style={{ marginTop: 40 }} />
            ) : searched ? (
              <Text style={styles.emptyText}>검색 결과가 없어요.</Text>
            ) : (
              <Text style={styles.emptyText}>검색어를 입력해보세요.</Text>
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  safeDesktop: { alignItems: 'center' },
  col: { flex: 1, width: '100%' },
  colDesktop: { maxWidth: 680, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.line },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.soft, borderRadius: 12, paddingHorizontal: 12, height: 40 },
  input: { flex: 1, fontSize: 14, color: colors.ink },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: colors.sub2 },
});

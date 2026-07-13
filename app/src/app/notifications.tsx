/** 알림 화면 — 내 글에 달린 댓글 목록. 진입 시 최신 알림을 '읽음'으로 저장(빨간점 해제). */
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getNotifications, type NotificationItem } from '@/api/notifications';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { Avatar } from '@/components/Avatar';
import { useIsDesktop } from '@/hooks/useResponsive';
import { setSeenAt } from '@/notifications/seen';
import { colors, weight } from '@/theme';

export default function NotificationsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getNotifications(token);
      setItems(res.items);
      // 최신 알림 시각을 '읽음' 기준으로 저장 → 빨간점 해제
      if (res.items[0]?.created_at) await setSeenAt(res.items[0].created_at);
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
        <AppBar title="알림" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={items.length === 0 ? styles.empty : { paddingVertical: 6 }}>
          {items.map((n) => (
            <Pressable
              key={n.id}
              style={styles.row}
              onPress={() => router.push({ pathname: '/post/[id]', params: { id: n.post_id } })}>
              <Avatar avatarNo={n.actor_avatar_no} size={38} />
              <View style={styles.body}>
                <Text style={styles.text}>
                  <Text style={styles.actor}>{n.actor}</Text>님이 내 글에 댓글을 남겼어요
                </Text>
                <Text style={styles.snippet} numberOfLines={1}>“{n.snippet}”</Text>
                <Text style={styles.meta}>{n.post_title} · {n.time_text}</Text>
              </View>
            </Pressable>
          ))}
          {loaded && items.length === 0 && <Text style={styles.emptyText}>아직 새 소식이 없어요.</Text>}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  safeDesktop: { alignItems: 'center' },
  col: { flex: 1, width: '100%' },
  colDesktop: { maxWidth: 680, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.line },
  body: { flex: 1, gap: 3 },
  text: { fontSize: 13.5, color: colors.ink, lineHeight: 19 },
  actor: { fontWeight: weight.bold as '700' },
  snippet: { fontSize: 12.5, color: colors.body },
  meta: { fontSize: 11.5, color: colors.sub },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: colors.sub2 },
});

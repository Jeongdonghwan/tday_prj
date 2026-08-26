/** 속마음이야기 목록 — 커플 둘의 회고 노트 타임라인. 커플 미연결이면 연결 유도. */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { listCoupleNotes, type CoupleNote, type NoteUser } from '@/api/coupleNotes';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { colors, radius, weight } from '@/theme';

export default function CoupleNotesScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [items, setItems] = useState<CoupleNote[]>([]);
  const [partner, setPartner] = useState<NoteUser | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'no_couple' | 'error'>('loading');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await listCoupleNotes(token);
      setItems(r.items);
      setPartner(r.partner);
      setState('ok');
    } catch (e) {
      setState(e instanceof ApiError && e.status === 403 ? 'no_couple' : 'error');
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar
        title="속마음이야기"
        onBack={() => router.back()}
        right={
          state === 'ok' ? (
            <Pressable onPress={() => router.push('/couple/notes/new')} hitSlop={8}>
              <Icon name="plus" size={24} color={colors.ink} strokeWidth={2} />
            </Pressable>
          ) : undefined
        }
      />
      {state === 'loading' ? (
        <ActivityIndicator color={colors.rose} style={{ marginTop: 60 }} />
      ) : state === 'no_couple' ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 40 }}>💑</Text>
          <Text style={styles.guide}>속마음이야기는 커플 연결 후 이용할 수 있어요</Text>
          <Text style={styles.guideS}>둘만 보는 공간에서 좋았던 점·아쉬웠던 점을 솔직하게 나눠보세요</Text>
          <Pressable style={styles.cta} onPress={() => router.push('/couple/connect')}>
            <Text style={styles.ctaT}>커플 연결하기</Text>
          </Pressable>
        </View>
      ) : state === 'error' ? (
        <View style={styles.center}><Text style={styles.guide}>불러오지 못했어요. 잠시 후 다시 시도해주세요.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={styles.intro}>
            <Text style={styles.introH}>우리 둘만 보는 회고 노트 🔒</Text>
            <Text style={styles.introP}>
              여행·기념일·다툼 뒤에 <Text style={styles.b}>좋았던 점 · 아쉬웠던 점 · 개선할 점</Text>을 양식대로 남기면
              {partner ? ` ${partner.nickname}님과` : ' 상대와'} 서로 볼 수 있어요.
            </Text>
          </View>

          {items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyT}>아직 작성한 이야기가 없어요</Text>
              <Pressable style={styles.cta} onPress={() => router.push('/couple/notes/new')}>
                <Text style={styles.ctaT}>첫 이야기 쓰기</Text>
              </Pressable>
            </View>
          ) : (
            items.map((n) => (
              <Pressable
                key={n.id}
                style={styles.card}
                onPress={() => router.push({ pathname: '/couple/notes/[id]', params: { id: n.id } })}>
                <View style={styles.cardTop}>
                  <Avatar avatarNo={n.author.avatar_no} size={28} />
                  <Text style={styles.who}>{n.is_mine ? '나' : n.author.nickname}</Text>
                  <Text style={styles.date}>{(n.note_date ?? n.created_at.slice(0, 10)).replace(/-/g, '.')}</Text>
                </View>
                <Text style={styles.title} numberOfLines={1}>{n.title}</Text>
                <Text style={styles.preview} numberOfLines={2}>
                  {n.good ? `💗 ${n.good}` : n.bad ? `😢 ${n.bad}` : `🌱 ${n.improve}`}
                </Text>
                <View style={styles.meta}>
                  <Icon name="chat" size={13} color={colors.sub2} strokeWidth={2} />
                  <Text style={styles.metaT}>답글 {n.comment_count}</Text>
                  <Text style={styles.metaT}>· {n.time_ago}</Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  guide: { fontSize: 15, fontWeight: weight.bold as '700', color: colors.ink, textAlign: 'center' },
  guideS: { fontSize: 13, color: colors.sub, textAlign: 'center', lineHeight: 19 },
  cta: { marginTop: 10, backgroundColor: colors.rose, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 12 },
  ctaT: { color: '#fff', fontSize: 14, fontWeight: weight.bold as '700' },
  intro: { backgroundColor: colors.roseBg, borderRadius: radius.cardLg, padding: 16, marginBottom: 14 },
  introH: { fontSize: 15, fontWeight: weight.extrabold as '800', color: colors.ink },
  introP: { fontSize: 12.5, color: colors.sub, lineHeight: 19, marginTop: 6 },
  b: { fontWeight: weight.bold as '700', color: colors.ink },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 6 },
  emptyT: { fontSize: 14, color: colors.sub2 },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.cardLg, padding: 14, marginBottom: 10, backgroundColor: colors.soft },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  who: { fontSize: 12.5, fontWeight: weight.bold as '700', color: colors.ink, flex: 1 },
  date: { fontSize: 11.5, color: colors.sub2 },
  title: { fontSize: 15.5, fontWeight: weight.extrabold as '800', color: colors.ink, marginTop: 8 },
  preview: { fontSize: 13, color: colors.sub, lineHeight: 19, marginTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  metaT: { fontSize: 11.5, color: colors.sub2 },
});

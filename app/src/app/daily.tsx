/** 오늘의 질문 (스펙 §5-3). API 연동: 1인 모드 + 커플 연결 시 답 공개. */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getToday, submitAnswer, type DailyToday } from '@/api/daily';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { Icon } from '@/components/Icon';
import { StatusChip } from '@/components/StatusChip';
import { colors, radius, weight } from '@/theme';

export default function DailyScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [data, setData] = useState<DailyToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await getToday(token);
      setData(d);
      setDraft(d.my_answer ?? '');
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onSubmit() {
    if (!token || !draft.trim() || !data?.question) return;
    setSaving(true);
    try {
      await submitAnswer(draft.trim(), token, data.question.id);
      await load();
    } catch {
      Alert.alert('오늘의 질문', '답변 저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppBar title="오늘의 질문" onBack={() => router.back()} right={user ? <StatusChip status={user.relationship_status} /> : undefined} />
        <ActivityIndicator color={colors.rose} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!data.question) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppBar title="오늘의 질문" onBack={() => router.back()} right={user ? <StatusChip status={user.relationship_status} /> : undefined} />
        <Text style={styles.noQ}>오늘의 질문이 아직 준비되지 않았어요.</Text>
      </SafeAreaView>
    );
  }

  const answered = data.my_answer != null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar title="오늘의 질문" onBack={() => router.back()} right={user ? <StatusChip status={user.relationship_status} /> : undefined} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
<ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.day}>{data.question.date}</Text>
          <Text style={styles.main}>{data.question.text}</Text>
          <Text style={styles.sub}>
            {data.connected
              ? `${data.partner?.nickname ?? '상대'}님과 모두 답하면 서로의 답이 공개돼요.`
              : '혼자 답해도 차곡차곡 쌓여요. 커플을 연결하면 상대 답도 볼 수 있어요.'}
          </Text>
          {data.streak > 0 && (
            <View style={styles.streak}>
              <Icon name="fire" size={13} color={colors.rose} />
              <Text style={styles.streakText}>{data.streak}일 연속 답변 중</Text>
            </View>
          )}
        </View>

        <TextInput
          style={styles.field}
          placeholder="생각을 자유롭게 적어보세요…"
          placeholderTextColor={colors.sub2}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <View style={[styles.submit, (!draft.trim() || saving) && styles.submitOff]}>
          <Text style={styles.submitText} onPress={onSubmit}>
            {saving ? '저장 중…' : answered ? '답변 수정하기' : '답변 남기기'}
          </Text>
        </View>

        {data.connected ? (
          <Text style={styles.note}>
            {data.partner?.answered
              ? data.partner.answer
                ? `${data.partner.nickname}님의 답: ${data.partner.answer}`
                : '둘 다 답하면 서로의 답이 공개돼요.'
              : `${data.partner?.nickname ?? '상대'}님은 아직 답하지 않았어요.`}
          </Text>
        ) : (
          <Text style={styles.note}>혼자 모드로 저장돼요. 커플 연결 시 상대 답도 볼 수 있어요.</Text>
        )}

        {data.past.length > 0 && (
          <View style={styles.peek}>
            <Text style={styles.peekTitle}>지난 질문</Text>
            {data.past.map((p) => (
              <View key={p.id} style={styles.prev}>
                <Text style={styles.prevQ} numberOfLines={1}>
                  {p.text}
                </Text>
                <Text style={[styles.prevR, { color: p.answered ? colors.rose : colors.sub2 }]}>
                  {p.answered ? '답함' : '미답'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
</KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  noQ: { textAlign: 'center', color: colors.sub, marginTop: 40, fontSize: 14 },
  hero: { paddingHorizontal: 20, paddingTop: 22 },
  day: { fontSize: 13, fontWeight: weight.bold as '700', color: colors.sub },
  main: { fontSize: 23, fontWeight: weight.extrabold as '800', color: colors.ink, lineHeight: 32, marginTop: 14, letterSpacing: -0.4 },
  sub: { fontSize: 13, color: colors.sub, marginTop: 10, lineHeight: 20 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: colors.roseBg, paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.chip, marginTop: 14 },
  streakText: { fontSize: 12, fontWeight: weight.bold as '700', color: colors.rose },
  field: { marginHorizontal: 20, marginTop: 22, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.card, padding: 15, minHeight: 96, fontSize: 14, color: colors.ink, lineHeight: 21, textAlignVertical: 'top' },
  submit: { marginHorizontal: 20, marginTop: 14, backgroundColor: colors.ink, borderRadius: radius.input, paddingVertical: 15, alignItems: 'center' },
  submitOff: { backgroundColor: colors.sub2 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: weight.bold as '700' },
  note: { textAlign: 'center', fontSize: 12, color: colors.sub, marginTop: 12, marginHorizontal: 20, lineHeight: 18 },
  peek: { marginHorizontal: 20, marginTop: 26, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.line },
  peekTitle: { fontSize: 13, fontWeight: weight.extrabold as '800', color: colors.sub, marginBottom: 12 },
  prev: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
  prevQ: { fontSize: 14, fontWeight: weight.semibold as '600', color: colors.ink, flex: 1, marginRight: 12 },
  prevR: { fontSize: 12, fontWeight: weight.bold as '700' },
});

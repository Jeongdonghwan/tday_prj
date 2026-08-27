/** 속마음이야기 작성/수정 양식 — 제목 / 날짜(선택) / 💗 좋았던 점 / 😢 아쉬웠던 점 / 🌱 개선할 점.
 *  ?id= 가 있으면 수정 모드(기존 값 프리필 → PUT). 제목 + 섹션 1개 이상 필수. */
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createCoupleNote, getCoupleNote, NOTE_SECTIONS, updateCoupleNote, type NoteInput } from '@/api/coupleNotes';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { notify } from '@/lib/dialogs';
import { colors, radius, weight } from '@/theme';

function todayDots() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function CoupleNoteFormScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id ? Number(id) : null;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayDots());
  const [good, setGood] = useState('');
  const [bad, setBad] = useState('');
  const [improve, setImprove] = useState('');
  const [busy, setBusy] = useState(false);

  const values = { good, bad, improve };
  const setters = { good: setGood, bad: setBad, improve: setImprove };

  useEffect(() => {
    if (!editId || !token) return;
    getCoupleNote(editId, token)
      .then((n) => {
        setTitle(n.title);
        setDate((n.note_date ?? n.created_at.slice(0, 10)).replace(/-/g, '.'));
        setGood(n.good);
        setBad(n.bad);
        setImprove(n.improve);
      })
      .catch(() => notify('속마음이야기', '불러오지 못했어요.'));
  }, [editId, token]);

  const canSubmit = title.trim().length > 0 && (good.trim() || bad.trim() || improve.trim());

  async function onSubmit() {
    if (!token || !canSubmit) return;
    const iso = date.replace(/[.\s]/g, '-').replace(/-+/g, '-');
    if (iso && !/^\d{4}-\d{1,2}-\d{1,2}$/.test(iso)) {
      notify('속마음이야기', '날짜는 예: 2026.08.21 형식으로 입력해주세요.');
      return;
    }
    const [y, m, d] = iso.split('-');
    const body: NoteInput = {
      title: title.trim(),
      good: good.trim(),
      bad: bad.trim(),
      improve: improve.trim(),
      note_date: iso ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : undefined,
    };
    setBusy(true);
    try {
      if (editId) {
        await updateCoupleNote(editId, body, token);
        router.back();
      } else {
        const n = await createCoupleNote(body, token);
        router.replace({ pathname: '/couple/notes/[id]', params: { id: n.id } });
      }
    } catch {
      notify('속마음이야기', '저장하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppBar title={editId ? '이야기 수정' : '속마음 남기기'} onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>둘만 볼 수 있어요. 비난보다는 "나는 이렇게 느꼈어"로 적어보세요 🔒</Text>

          <Text style={styles.label}>제목</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 나트랑 여행 후기"
            placeholderTextColor={colors.sub2}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />

          <Text style={styles.label}>날짜 <Text style={styles.opt}>(선택)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="예: 2026.08.21"
            placeholderTextColor={colors.sub2}
            value={date}
            onChangeText={setDate}
            keyboardType="numbers-and-punctuation"
          />

          {NOTE_SECTIONS.map((s) => (
            <View key={s.key}>
              <Text style={styles.label}>{s.emoji} {s.label}</Text>
              <TextInput
                style={[styles.input, styles.area]}
                placeholder={s.placeholder}
                placeholderTextColor={colors.sub2}
                value={values[s.key]}
                onChangeText={setters[s.key]}
                multiline
                textAlignVertical="top"
                maxLength={2000}
              />
            </View>
          ))}

          <Pressable style={[styles.submit, (!canSubmit || busy) && styles.submitOff]} disabled={!canSubmit || busy} onPress={onSubmit}>
            <Text style={styles.submitT}>{busy ? '저장 중...' : editId ? '수정 완료' : '남기기'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  hint: { fontSize: 12.5, color: colors.sub, backgroundColor: colors.roseBg, borderRadius: radius.card, padding: 12, lineHeight: 18 },
  label: { fontSize: 13.5, fontWeight: weight.bold as '700', color: colors.ink, marginTop: 18, marginBottom: 7 },
  opt: { fontSize: 12, color: colors.sub2, fontWeight: weight.semibold as '600' },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 14.5, color: colors.ink, backgroundColor: colors.soft },
  area: { height: 110, paddingTop: 12, paddingBottom: 12, lineHeight: 20 },
  submit: { marginTop: 28, backgroundColor: colors.rose, borderRadius: radius.input, height: 52, alignItems: 'center', justifyContent: 'center' },
  submitOff: { opacity: 0.45 },
  submitT: { color: '#fff', fontSize: 15, fontWeight: weight.bold as '700' },
});

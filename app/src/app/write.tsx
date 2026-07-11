/** 글쓰기 (목업 v3-1). 골격: 카테고리 + 제목/본문 + 작성자 상태칩 + 투표 토글 + A/B 입력. */
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { createPost, suggestPoll } from '@/api/posts';
import { useAuth } from '@/auth/AuthContext';
import { FilterRow } from '@/components/FilterRow';
import { Icon } from '@/components/Icon';
import { StatusChip } from '@/components/StatusChip';
import { colors, radius, weight, type PostCategory } from '@/theme';

const WRITE_CATEGORIES = [
  { key: 'love', label: '연애' },
  { key: 'marriage', label: '결혼·부부' },
  { key: 'counsel', label: '고민상담' },
  { key: 'free', label: '자유' },
];

export default function WriteScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [cat, setCat] = useState('love');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [poll, setPoll] = useState(false);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const pollValid = !poll || (a.trim().length > 0 && b.trim().length > 0);
  const canPost = title.trim().length > 0 && pollValid && !submitting;

  async function onSubmit() {
    if (!canPost || !token) return;
    setSubmitting(true);
    try {
      await createPost(
        {
          category: cat as PostCategory,
          title: title.trim(),
          body: body.trim() || undefined,
          is_poll: poll,
          poll: poll ? { a: a.trim(), b: b.trim() } : undefined,
        },
        token,
      );
      router.back(); // 피드는 포커스 시 자동 새로고침
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : '등록에 실패했어요.';
      Alert.alert('글쓰기', msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSuggest() {
    if (!token || !title.trim()) {
      Alert.alert('AI 추천', '먼저 제목을 입력해주세요.');
      return;
    }
    setSuggesting(true);
    try {
      const r = await suggestPoll({ title: title.trim(), body: body.trim() || undefined }, token);
      setA(r.a);
      setB(r.b);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 503
          ? 'AI 추천은 아직 준비 중이에요.'
          : 'AI 추천을 가져오지 못했어요.';
      Alert.alert('AI 추천', msg);
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.cancel}>취소</Text>
        </Pressable>
        <Text style={styles.barTitle}>글쓰기</Text>
        <Pressable hitSlop={8} disabled={!canPost} onPress={onSubmit}>
          <Text style={[styles.post, canPost && styles.postActive]}>{submitting ? '등록 중' : '등록'}</Text>
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={{ paddingTop: 14 }}>
          <FilterRow items={WRITE_CATEGORIES} value={cat} onChange={setCat} />
        </View>

        <TextInput
          style={styles.titleInput}
          placeholder="제목을 입력하세요"
          placeholderTextColor={colors.sub2}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.bodyInput}
          placeholder="무슨 일이 있었나요? 편하게 적어보세요."
          placeholderTextColor={colors.sub2}
          value={body}
          onChangeText={setBody}
          multiline
        />

        <View style={styles.meta}>
          <Text style={styles.metaLabel}>작성자 상태</Text>
          <StatusChip status={user?.relationship_status ?? 'couple'} />
          <Text style={[styles.metaLabel, { marginLeft: 'auto' }]}>자동 표시</Text>
        </View>

        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleTitle}>투표 만들기</Text>
            <Text style={styles.toggleSub}>편 갈리는 주제면 켜보세요</Text>
          </View>
          <Pressable style={[styles.toggle, !poll && styles.toggleOff]} onPress={() => setPoll((p) => !p)}>
            <View style={[styles.knob, !poll && styles.knobOff]} />
          </Pressable>
        </View>

        {poll && (
          <View style={styles.vinputs}>
            <View style={styles.vin}>
              <Text style={[styles.sideTag, { color: colors.rose }]}>A</Text>
              <TextInput style={styles.vinbox} placeholder="첫 번째 선택지" placeholderTextColor={colors.sub2} value={a} onChangeText={setA} />
            </View>
            <View style={styles.vin}>
              <Text style={[styles.sideTag, { color: colors.blue }]}>B</Text>
              <TextInput style={styles.vinbox} placeholder="두 번째 선택지" placeholderTextColor={colors.sub2} value={b} onChangeText={setB} />
            </View>
            <Pressable style={[styles.aiBtn, suggesting && styles.aiBtnOff]} disabled={suggesting} onPress={onSuggest}>
              <Text style={styles.aiBtnText}>{suggesting ? 'AI가 고민 중…' : 'AI 추천 받기'}</Text>
            </Pressable>
            <View style={styles.hint}>
              <Icon name="info" size={15} color={colors.sub} strokeWidth={2} />
              <Text style={styles.hintText}>
                <Text style={{ fontWeight: weight.bold as '700', color: colors.ink }}>둘 중 하나를 고르게</Text> 적어야 투표가
                재밌어요. 비워두면 AI가 제안해줘요.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  cancel: { fontSize: 14, color: colors.sub, fontWeight: weight.semibold as '600' },
  barTitle: { fontSize: 15, fontWeight: weight.extrabold as '800', color: colors.ink },
  post: { fontSize: 14, fontWeight: weight.bold as '700', color: colors.sub2 },
  postActive: { color: colors.rose },
  titleInput: { fontSize: 18, fontWeight: weight.bold as '700', paddingHorizontal: 18, paddingVertical: 12, color: colors.ink },
  bodyInput: { fontSize: 15, lineHeight: 24, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 14, color: colors.body, minHeight: 120, textAlignVertical: 'top' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.line, borderBottomWidth: 8, borderBottomColor: colors.soft },
  metaLabel: { fontSize: 13, color: colors.sub, fontWeight: weight.semibold as '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  toggleTitle: { fontSize: 15, fontWeight: weight.bold as '700', color: colors.ink },
  toggleSub: { fontSize: 12, color: colors.sub, marginTop: 3 },
  toggle: { width: 46, height: 28, borderRadius: 999, backgroundColor: colors.rose, justifyContent: 'center' },
  toggleOff: { backgroundColor: colors.line },
  knob: { position: 'absolute', right: 3, width: 22, height: 22, borderRadius: 999, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  knobOff: { right: undefined, left: 3 },
  vinputs: { paddingHorizontal: 18, paddingBottom: 20 },
  vin: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sideTag: { fontSize: 11, fontWeight: weight.extrabold as '800', width: 20 },
  vinbox: { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.button, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, fontWeight: weight.semibold as '600', color: colors.ink },
  aiBtn: { alignSelf: 'flex-start', borderWidth: 1.5, borderColor: colors.rose, borderRadius: radius.chip, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 10 },
  aiBtnOff: { opacity: 0.5 },
  aiBtnText: { color: colors.rose, fontSize: 13, fontWeight: weight.bold as '700' },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: colors.soft, borderRadius: radius.button, padding: 13 },
  hintText: { flex: 1, fontSize: 12, color: colors.sub, lineHeight: 18 },
});

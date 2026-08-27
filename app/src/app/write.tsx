/** 글쓰기 + 내 글 수정(?edit=<id>). 골격: 카테고리 + 제목/본문 + 작성자 상태칩 + 투표 토글 + A/B 입력. */
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { createPost, getPost, updatePost } from '@/api/posts';
import { useAuth } from '@/auth/AuthContext';
import { notify } from '@/lib/dialogs';
import { FilterRow } from '@/components/FilterRow';
import { Icon } from '@/components/Icon';
import { StatusChip } from '@/components/StatusChip';
import { QUICK_ITEMS } from '@/quickmenu';
import { colors, radius, weight, type PostCategory } from '@/theme';

// 홈 퀵메뉴와 동일한 게시판 라벨(전체·테스트 제외). 각 라벨은 서버 카테고리 4종에 매핑.
const WRITE_CATEGORIES = QUICK_ITEMS.flatMap((q) =>
  q.kind === 'community' && q.category !== 'all'
    ? [{ key: q.key, label: q.label, category: q.category }]
    : [],
);

export default function WriteScreen() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { user, token } = useAuth();
  const [cat, setCat] = useState(WRITE_CATEGORIES[0].key);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [poll, setPoll] = useState(false);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!edit;

  // 수정 모드: 기존 글 로드 → 프리필 (투표 선택지는 공정성 위해 수정 불가)
  useEffect(() => {
    if (!edit) return;
    getPost(edit, token ?? undefined)
      .then((p) => {
        setTitle(p.title);
        setBody(p.body ?? '');
        const found = WRITE_CATEGORIES.find((c) => c.category === p.category);
        if (found) setCat(found.key);
      })
      .catch(() => notify('수정', '글을 불러오지 못했어요.'));
  }, [edit, token]);

  const pollValid = !poll || (a.trim().length > 0 && b.trim().length > 0);
  const canPost = title.trim().length > 0 && pollValid && !submitting;

  async function onSubmit() {
    if (!canPost || !token) return;
    const selectedCategory = (WRITE_CATEGORIES.find((c) => c.key === cat) ?? WRITE_CATEGORIES[0])
      .category as PostCategory;
    setSubmitting(true);
    try {
      if (isEdit) {
        await updatePost(edit!, { title: title.trim(), body: body.trim(), category: selectedCategory }, token);
      } else {
        await createPost(
          {
            category: selectedCategory,
            title: title.trim(),
            body: body.trim() || undefined,
            is_poll: poll,
            poll: poll ? { a: a.trim(), b: b.trim() } : undefined,
          },
          token,
        );
      }
      router.back(); // 피드/상세는 포커스 시 자동 새로고침
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : isEdit ? '수정에 실패했어요.' : '등록에 실패했어요.';
      notify('글쓰기', msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
     <View style={styles.col}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.cancel}>취소</Text>
        </Pressable>
        <Text style={styles.barTitle}>{isEdit ? '글 수정' : '글쓰기'}</Text>
        <Pressable hitSlop={8} disabled={!canPost} onPress={onSubmit}>
          <Text style={[styles.post, canPost && styles.postActive]}>
            {submitting ? (isEdit ? '수정 중' : '등록 중') : isEdit ? '수정' : '등록'}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
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

        {/* 수정 모드에선 투표 구조 변경 불가(공정성) — 토글 숨김 */}
        {!isEdit && (
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>투표 만들기</Text>
              <Text style={styles.toggleSub}>편 갈리는 주제면 켜보세요</Text>
            </View>
            <Pressable style={[styles.toggle, !poll && styles.toggleOff]} onPress={() => setPoll((p) => !p)}>
              <View style={[styles.knob, !poll && styles.knobOff]} />
            </Pressable>
          </View>
        )}

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
            <View style={styles.hint}>
              <Icon name="info" size={15} color={colors.sub} strokeWidth={2} />
              <Text style={styles.hintText}>
                <Text style={{ fontWeight: weight.bold as '700', color: colors.ink }}>둘 중 하나를 고르게</Text> 적어야 투표가
                재밌어요.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
</KeyboardAvoidingView>
     </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  col: { flex: 1, width: '100%' },
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
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: colors.soft, borderRadius: radius.button, padding: 13 },
  hintText: { flex: 1, fontSize: 12, color: colors.sub, lineHeight: 18 },
});

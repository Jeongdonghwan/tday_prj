/** 썰전 상세 (스펙 §5-2). API 연동: 투표(중복 불가) + 댓글 목록/작성 + 좋아요. */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { blockUser, reportTarget } from '@/api/moderation';
import {
  createComment,
  getPost,
  likePost,
  listComments,
  votePost,
  type ApiComment,
  type ApiPost,
} from '@/api/posts';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { StatusChip } from '@/components/StatusChip';
import { colors, radius, weight } from '@/theme';

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [post, setPost] = useState<ApiPost | null>(null);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([getPost(id, token), listComments(id, token)]);
      setPost(p);
      setComments(c.items);
    } catch {
      Alert.alert('오류', '글을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onVote(side: 'A' | 'B') {
    if (!token) return;
    try {
      const updated = await votePost(id, side, token);
      setPost(updated);
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 409 ? '이미 투표했어요.' : '투표에 실패했어요.';
      Alert.alert('투표', msg);
    }
  }

  async function onLike() {
    if (!token) return;
    try {
      const { like_count } = await likePost(id, token);
      setPost((p) => (p ? { ...p, like_count } : p));
    } catch {
      /* noop */
    }
  }

  function onMore() {
    if (!post) return;
    Alert.alert('이 글', undefined, [
      {
        text: '신고하기',
        onPress: () =>
          Alert.alert('신고', '이 글을 신고할까요?', [
            { text: '취소', style: 'cancel' },
            {
              text: '신고',
              style: 'destructive',
              onPress: async () => {
                if (!token) return;
                try {
                  const r = await reportTarget({ target_type: 'post', target_id: post.id, reason: '부적절' }, token);
                  Alert.alert('신고', r.blinded ? '신고가 누적되어 가려졌어요.' : '신고가 접수됐어요.');
                } catch {
                  Alert.alert('신고', '신고에 실패했어요.');
                }
              },
            },
          ]),
      },
      {
        text: '작성자 차단',
        style: 'destructive',
        onPress: async () => {
          if (!token || !post.author.id) return;
          try {
            await blockUser(post.author.id, token);
            Alert.alert('차단', '차단했어요. 이 유저의 글이 보이지 않아요.', [
              { text: '확인', onPress: () => router.back() },
            ]);
          } catch {
            Alert.alert('차단', '차단에 실패했어요.');
          }
        },
      },
      { text: '취소', style: 'cancel' },
    ]);
  }

  async function onSend() {
    if (!token || !input.trim()) return;
    setSending(true);
    try {
      await createComment(id, input.trim(), token);
      setInput('');
      const c = await listComments(id, token);
      setComments(c.items);
      setPost((p) => (p ? { ...p, comment_count: c.count } : p));
    } catch {
      Alert.alert('댓글', '댓글 등록에 실패했어요.');
    } finally {
      setSending(false);
    }
  }

  if (loading || !post) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <DetailBar onBack={() => router.back()} onLike={() => {}} onMore={() => {}} />
        <ActivityIndicator color={colors.rose} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const voted = post.poll?.my_vote != null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DetailBar onBack={() => router.back()} onLike={onLike} onMore={onMore} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.cat}>{post.category_label}</Text>
          <Text style={styles.title}>{post.title}</Text>
          <View style={styles.author}>
            <StatusChip status={post.author.status} />
            <Text style={styles.authorText}>
              {post.author.nickname} · {post.time_text} · 조회 {post.view_count.toLocaleString()}
            </Text>
          </View>

          {post.body ? <Text style={styles.text}>{post.body}</Text> : <View style={{ height: 16 }} />}

          {post.poll && (
            <>
              {!voted ? (
                <>
                  <Text style={styles.vquestion}>당신의 선택은?</Text>
                  <View style={styles.vbtns}>
                    <Pressable style={styles.choiceBtn} onPress={() => onVote('A')}>
                      <Text style={[styles.choiceText, { color: colors.rose }]}>{post.poll.a_label}</Text>
                    </Pressable>
                    <Pressable style={styles.choiceBtn} onPress={() => onVote('B')}>
                      <Text style={[styles.choiceText, { color: colors.blue }]}>{post.poll.b_label}</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.vbtns}>
                    <ResultCard
                      label={post.poll.a_label}
                      pct={post.poll.a_pct}
                      tone={colors.rose}
                      chosen={post.poll.my_vote === 'A'}
                    />
                    <ResultCard
                      label={post.poll.b_label}
                      pct={100 - post.poll.a_pct}
                      tone={colors.blue}
                      chosen={post.poll.my_vote === 'B'}
                    />
                  </View>
                  <Text style={styles.vtotal}>
                    총 {post.poll.total.toLocaleString()}명 참여 · 내 선택:{' '}
                    {post.poll.my_vote === 'A' ? post.poll.a_label : post.poll.b_label}
                  </Text>
                </>
              )}
            </>
          )}

          <Text style={styles.cmthead}>댓글 {post.comment_count}</Text>
          {comments.length === 0 ? (
            <Text style={styles.noComment}>첫 댓글을 남겨보세요.</Text>
          ) : (
            comments.map((c) => <CommentItem key={c.id} comment={c} />)
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            placeholder="댓글을 입력하세요"
            placeholderTextColor={colors.sub2}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnOff]}
            disabled={!input.trim() || sending}
            onPress={onSend}>
            <Text style={styles.sendText}>{sending ? '...' : '등록'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DetailBar({ onBack, onLike, onMore }: { onBack: () => void; onLike: () => void; onMore: () => void }) {
  return (
    <View style={styles.bar}>
      <Pressable onPress={onBack} hitSlop={8}>
        <Icon name="back" size={24} color={colors.ink} strokeWidth={1.9} />
      </Pressable>
      <View style={styles.barRight}>
        <Pressable onPress={onLike} hitSlop={8}>
          <Icon name="heart" size={22} color={colors.ink} />
        </Pressable>
        <Pressable onPress={onMore} hitSlop={8}>
          <Icon name="more" size={22} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

function ResultCard({ label, pct, tone, chosen }: { label: string; pct: number; tone: string; chosen: boolean }) {
  return (
    <View style={[styles.resultCard, chosen && { borderColor: tone, backgroundColor: tone + '14' }]}>
      <Text style={[styles.resultLabel, { color: tone }]}>{label}</Text>
      <Text style={[styles.resultPct, { color: tone }]}>{pct}%</Text>
      {chosen && <Text style={[styles.resultMine, { color: tone }]}>내 선택</Text>}
    </View>
  );
}

function CommentItem({ comment }: { comment: ApiComment }) {
  return (
    <View style={styles.cmt}>
      <View style={styles.cmAv}>
        <Text style={styles.cmAvText}>{comment.author.nickname.slice(0, 1)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cmTop}>
          <Text style={styles.cmName}>{comment.author.nickname}</Text>
          <StatusChip status={comment.author.status} small />
        </View>
        <Text style={styles.cmText}>{comment.body}</Text>
        <Text style={styles.cmMeta}>
          {comment.time_text} · 좋아요 {comment.like_count}
          {comment.reply_count > 0 ? ` · 답글 ${comment.reply_count}` : ''}
        </Text>
        {comment.replies.map((r) => (
          <View key={r.id} style={styles.reply}>
            <View style={styles.cmTop}>
              <Text style={styles.cmName}>{r.author.nickname}</Text>
              <StatusChip status={r.author.status} small />
            </View>
            <Text style={styles.cmText}>{r.body}</Text>
            <Text style={styles.cmMeta}>{r.time_text} · 좋아요 {r.like_count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  barRight: { flexDirection: 'row', gap: 16 },
  wrap: { paddingHorizontal: 20, paddingBottom: 24 },
  cat: { fontSize: 12, fontWeight: weight.bold as '700', color: colors.rose },
  title: { fontSize: 20, fontWeight: weight.extrabold as '800', color: colors.ink, lineHeight: 27, letterSpacing: -0.4, marginTop: 9, marginBottom: 14 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  authorText: { fontSize: 12, color: colors.sub },
  text: { fontSize: 15, lineHeight: 24, color: colors.body, marginTop: 16, marginBottom: 22 },
  vquestion: { fontSize: 13, fontWeight: weight.bold as '700', color: colors.sub, textAlign: 'center', marginBottom: 12 },
  vbtns: { flexDirection: 'row', gap: 10 },
  choiceBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.card, paddingVertical: 22, paddingHorizontal: 12, alignItems: 'center' },
  choiceText: { fontSize: 14, fontWeight: weight.bold as '700' },
  resultCard: { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.card, paddingVertical: 18, paddingHorizontal: 12, alignItems: 'center' },
  resultLabel: { fontSize: 12, fontWeight: weight.bold as '700', marginBottom: 8, textAlign: 'center' },
  resultPct: { fontSize: 26, fontWeight: weight.extrabold as '800', letterSpacing: -0.4 },
  resultMine: { fontSize: 11, fontWeight: weight.bold as '700', marginTop: 4 },
  vtotal: { textAlign: 'center', fontSize: 12, color: colors.sub, marginTop: 12 },
  cmthead: { fontSize: 14, fontWeight: weight.extrabold as '800', color: colors.ink, marginTop: 24, marginBottom: 4 },
  noComment: { fontSize: 13, color: colors.sub2, paddingVertical: 18, textAlign: 'center' },
  cmt: { flexDirection: 'row', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  cmAv: { width: 32, height: 32, borderRadius: 999, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  cmAvText: { fontSize: 12, fontWeight: weight.bold as '700', color: colors.sub },
  cmTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cmName: { fontSize: 12.5, fontWeight: weight.bold as '700', color: colors.ink },
  cmText: { fontSize: 14, lineHeight: 21, color: colors.body },
  cmMeta: { fontSize: 11.5, color: colors.sub2, marginTop: 6 },
  reply: { marginTop: 12, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: colors.line },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg },
  composerInput: { flex: 1, maxHeight: 100, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.ink },
  sendBtn: { paddingHorizontal: 16, height: 42, borderRadius: radius.button, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: colors.sub2 },
  sendText: { color: '#fff', fontWeight: weight.bold as '700', fontSize: 14 },
});

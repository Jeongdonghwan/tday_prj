/** 오늘연애 상세 (스펙 §5-2). API 연동: 투표(중복 불가) + 댓글 목록/작성 + 좋아요. */
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
import { Image } from 'expo-image';
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
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { PollResultBar } from '@/components/PollResultBar';
import { StatusChip } from '@/components/StatusChip';
import { useIsDesktop } from '@/hooks/useResponsive';
import { colors, radius, statusTheme, weight } from '@/theme';

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const isDesktop = useIsDesktop();

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
      const { like_count, liked } = await likePost(id, token);
      setPost((p) => (p ? { ...p, like_count, liked } : p));
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
    <SafeAreaView style={[styles.safe, isDesktop && styles.safeDesktop]} edges={['top']}>
     <View style={[styles.col, isDesktop && styles.colDesktop]}>
      <DetailBar onBack={() => router.back()} onLike={onLike} onMore={onMore} liked={post.liked} likeCount={post.like_count} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.cat}>{post.category_label}</Text>
          <Text style={styles.title}>{post.title}</Text>
          <View style={styles.author}>
            <Text style={styles.authorText}>
              <Text style={styles.authorName}>{post.author.nickname}</Text> · {statusTheme[post.author.status].label} · {post.time_text} · 조회 {post.view_count.toLocaleString()}
            </Text>
          </View>

          {post.image_url ? <Image source={{ uri: post.image_url }} style={styles.photo} contentFit="cover" /> : null}
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
                <PollResultBar
                  aLabel={post.poll.a_label}
                  bLabel={post.poll.b_label}
                  aPct={post.poll.a_pct}
                  total={post.poll.total}
                  myVote={post.poll.my_vote}
                />
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
     </View>
    </SafeAreaView>
  );
}

function DetailBar({
  onBack,
  onLike,
  onMore,
  liked = false,
  likeCount,
}: {
  onBack: () => void;
  onLike: () => void;
  onMore: () => void;
  liked?: boolean;
  likeCount?: number;
}) {
  return (
    <View style={styles.bar}>
      <Pressable onPress={onBack} hitSlop={8}>
        <Icon name="back" size={24} color={colors.ink} strokeWidth={1.9} />
      </Pressable>
      <View style={styles.barRight}>
        <Pressable onPress={onLike} hitSlop={8} style={styles.likeBtn}>
          <Icon name={liked ? 'heartFill' : 'heart'} size={22} color={liked ? colors.rose : colors.ink} />
          {typeof likeCount === 'number' && (
            <Text style={[styles.likeCount, liked && { color: colors.rose }]}>{likeCount}</Text>
          )}
        </Pressable>
        <Pressable onPress={onMore} hitSlop={8}>
          <Icon name="more" size={22} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

function CommentItem({ comment }: { comment: ApiComment }) {
  return (
    <View style={styles.cmt}>
      <Avatar avatarNo={comment.author.avatar_no} size={28} />
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
            <Avatar avatarNo={r.author.avatar_no} size={24} />
            <View style={{ flex: 1 }}>
              <View style={styles.cmTop}>
                <Text style={styles.cmName}>{r.author.nickname}</Text>
                <StatusChip status={r.author.status} small />
              </View>
              <Text style={styles.cmText}>{r.body}</Text>
              <Text style={styles.cmMeta}>{r.time_text} · 좋아요 {r.like_count}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  safeDesktop: { alignItems: 'center' },
  col: { flex: 1, width: '100%' },
  colDesktop: { maxWidth: 680, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.line },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  barRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeCount: { fontSize: 13, fontWeight: weight.bold as '700', color: colors.ink },
  wrap: { paddingHorizontal: 20, paddingBottom: 24 },
  cat: { fontSize: 12, fontWeight: weight.bold as '700', color: colors.rose },
  title: { fontSize: 20, fontWeight: weight.extrabold as '800', color: colors.ink, lineHeight: 27, letterSpacing: -0.4, marginTop: 9, marginBottom: 14 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  authorText: { fontSize: 12, color: colors.sub },
  authorName: { fontSize: 12, color: colors.ink, fontWeight: weight.semibold as '600' },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: colors.soft, marginTop: 16 },
  text: { fontSize: 15, lineHeight: 24, color: colors.body, marginTop: 16, marginBottom: 22 },
  vquestion: { fontSize: 13, fontWeight: weight.bold as '700', color: colors.sub, textAlign: 'center', marginBottom: 12 },
  vbtns: { flexDirection: 'row', gap: 10 },
  choiceBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.card, paddingVertical: 22, paddingHorizontal: 12, alignItems: 'center' },
  choiceText: { fontSize: 14, fontWeight: weight.bold as '700' },
  cmthead: { fontSize: 14, fontWeight: weight.extrabold as '800', color: colors.ink, marginTop: 24, marginBottom: 4 },
  noComment: { fontSize: 13, color: colors.sub2, paddingVertical: 18, textAlign: 'center' },
  cmt: { flexDirection: 'row', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  cmTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cmName: { fontSize: 12.5, fontWeight: weight.bold as '700', color: colors.ink },
  cmText: { fontSize: 14, lineHeight: 21, color: colors.body },
  cmMeta: { fontSize: 11.5, color: colors.sub2, marginTop: 6 },
  reply: { flexDirection: 'row', gap: 8, marginTop: 12, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: colors.line },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg },
  composerInput: { flex: 1, maxHeight: 100, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.ink },
  sendBtn: { paddingHorizontal: 16, height: 42, borderRadius: radius.button, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: colors.sub2 },
  sendText: { color: '#fff', fontWeight: weight.bold as '700', fontSize: 14 },
});

/** 오늘의 연애 이슈 상세 (DESIGN_UPDATE §5): 요약 + 투표결과 + 댓글. */
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
import * as WebBrowser from 'expo-web-browser';

import { ApiError } from '@/api/client';
import { createIssueComment, getIssue, listIssueComments, voteIssue, type Issue } from '@/api/issues';
import type { ApiComment } from '@/api/posts';
import { useAuth } from '@/auth/AuthContext';
import { requireLogin } from '@/lib/dialogs';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { StatusChip } from '@/components/StatusChip';
import { useCommentActions } from '@/components/useCommentActions';
import { useIsDesktop } from '@/hooks/useResponsive';
import { colors, radius, weight } from '@/theme';

const BODY = '#4E5968';
const TRACK = '#F2F3F5';

export default function IssueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const isDesktop = useIsDesktop();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const cmActions = useCommentActions('issue_comment', () => reload());

  const reload = useCallback(async () => {
    // 게스트도 열람 가능 (읽기는 공개 API — 투표/댓글만 로그인)
    try {
      const [i, c] = await Promise.all([getIssue(id, token), listIssueComments(id, token)]);
      setIssue(i.issue);
      setComments(c.items);
    } catch {
      Alert.alert('오류', '이슈를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onVote(side: 'a' | 'b') {
    if (!token) return requireLogin();
    if (!issue || issue.my_vote) return;
    try {
      setIssue((await voteIssue(id, side, token)).issue);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) reload();
    }
  }

  async function onSend() {
    if (!token) return requireLogin();
    if (!input.trim()) return;
    setSending(true);
    try {
      await createIssueComment(id, input.trim(), token);
      setInput('');
      const c = await listIssueComments(id, token);
      setComments(c.items);
      setIssue((i) => (i ? { ...i, comment_count: c.count } : i));
    } catch {
      Alert.alert('댓글', '등록에 실패했어요.');
    } finally {
      setSending(false);
    }
  }

  if (loading || !issue) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Bar onBack={() => router.back()} />
        <ActivityIndicator color={colors.rose} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const voted = issue.my_vote != null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
     <View style={styles.col}>
      {cmActions.sheet}
      <Bar onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>오늘의 연애 이슈</Text>
          <Text style={styles.title}>{issue.title}</Text>
          <Text style={styles.summary}>{issue.summary}</Text>
          {(issue.source || issue.url) && (
            <Pressable onPress={() => issue.url && WebBrowser.openBrowserAsync(issue.url)} disabled={!issue.url} hitSlop={6}>
              <Text style={styles.source}>{issue.source ?? '출처'} · 원문 보기 ↗</Text>
            </Pressable>
          )}

          {!voted ? (
            <View style={styles.vs}>
              <Pressable style={[styles.vsBtn, { backgroundColor: colors.rose }]} onPress={() => onVote('a')}>
                <Text style={styles.vsText}>{issue.poll.a_label}</Text>
              </Pressable>
              <Pressable style={[styles.vsBtn, { backgroundColor: colors.blue }]} onPress={() => onVote('b')}>
                <Text style={styles.vsText}>{issue.poll.b_label}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.result}>
              <Bar2 label={issue.poll.a_label} pct={issue.poll.a_pct} tone={colors.rose} mine={issue.my_vote === 'a'} />
              <Bar2 label={issue.poll.b_label} pct={100 - issue.poll.a_pct} tone={colors.blue} mine={issue.my_vote === 'b'} />
              <Text style={styles.participants}>{issue.poll.total.toLocaleString()}명 참여</Text>
            </View>
          )}

          <Text style={styles.cmthead}>댓글 {issue.comment_count}</Text>
          {comments.length === 0 ? (
            <Text style={styles.noComment}>첫 댓글을 남겨보세요.</Text>
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.cmt}>
                <Avatar avatarNo={c.author.avatar_no} size={28} />
                <View style={{ flex: 1 }}>
                  <View style={styles.cmTop}>
                    <Text style={styles.cmName}>{c.author.nickname}</Text>
                    <StatusChip status={c.author.status} small />
                    {!cmActions.isMine(c) && (
                      <Pressable onPress={() => cmActions.openFor(c)} hitSlop={8} style={{ marginLeft: 'auto' }}>
                        <Icon name="more" size={16} color={colors.sub2} />
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.cmText}>{c.body}</Text>
                  <Text style={styles.cmMeta}>{c.time_text} · 좋아요 {c.like_count}</Text>
                </View>
              </View>
            ))
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
          <Pressable style={[styles.sendBtn, (!input.trim() || sending) && styles.sendOff]} disabled={!input.trim() || sending} onPress={onSend}>
            <Text style={styles.sendText}>{sending ? '...' : '등록'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
     </View>
    </SafeAreaView>
  );
}

function Bar({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.bar}>
      <Pressable onPress={onBack} hitSlop={8}>
        <Icon name="back" size={24} color={colors.ink} strokeWidth={1.9} />
      </Pressable>
    </View>
  );
}

function Bar2({ label, pct, tone, mine }: { label: string; pct: number; tone: string; mine: boolean }) {
  return (
    <View style={{ gap: 5 }}>
      <View style={styles.resultHead}>
        <Text style={[styles.resultLabel, mine && { color: tone }]}>{label}{mine ? ' · 내 선택' : ''}</Text>
        <Text style={styles.resultPct}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: tone }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  col: { flex: 1, width: '100%' },
  bar: { paddingHorizontal: 16, paddingVertical: 8 },
  wrap: { paddingHorizontal: 20, paddingBottom: 24 },
  label: { fontSize: 11.5, fontWeight: weight.bold as '700', color: colors.sub },
  title: { fontSize: 19, fontWeight: weight.extrabold as '800', color: colors.ink, lineHeight: 27, marginTop: 8, letterSpacing: -0.4 },
  summary: { fontSize: 14, color: BODY, lineHeight: 22, marginTop: 10 },
  source: { fontSize: 12, color: colors.sub, marginTop: 10 },
  vs: { flexDirection: 'row', gap: 10, marginTop: 16 },
  vsBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  vsText: { color: '#fff', fontSize: 14, fontWeight: weight.bold as '700' },
  result: { marginTop: 16, gap: 10 },
  resultHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultLabel: { fontSize: 12.5, fontWeight: weight.semibold as '600', color: BODY },
  resultPct: { fontSize: 12.5, fontWeight: weight.bold as '700', color: colors.ink },
  track: { height: 8, borderRadius: 5, backgroundColor: TRACK, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  participants: { fontSize: 11.5, color: colors.sub2, marginTop: 2 },
  cmthead: { fontSize: 14, fontWeight: weight.extrabold as '800', color: colors.ink, marginTop: 24, marginBottom: 8, paddingTop: 20, borderTopWidth: 0.5, borderTopColor: colors.line },
  noComment: { fontSize: 13, color: colors.sub2, paddingVertical: 18, textAlign: 'center' },
  cmt: { flexDirection: 'row', gap: 10, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.line },
  cmTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cmName: { fontSize: 12.5, fontWeight: weight.bold as '700', color: colors.ink },
  cmText: { fontSize: 14, lineHeight: 21, color: colors.body },
  cmMeta: { fontSize: 11.5, color: colors.sub2, marginTop: 6 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: colors.line, backgroundColor: colors.bg },
  composerInput: { flex: 1, maxHeight: 100, borderWidth: 1, borderColor: colors.line, borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.ink },
  sendBtn: { paddingHorizontal: 16, height: 42, borderRadius: radius.button, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' },
  sendOff: { backgroundColor: colors.sub2 },
  sendText: { color: '#fff', fontWeight: weight.bold as '700', fontSize: 14 },
});

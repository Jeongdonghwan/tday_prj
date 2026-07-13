/** 연애이슈 카드 (HOME_UPDATE §3): 운영자 큐레이션 뉴스/칼럼 스타일. 하단에 부가 투표. */
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { getTodayIssue, voteIssue, type Issue } from '@/api/issues';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { colors, weight } from '@/theme';

const BODY = '#4E5968';
const TRACK = '#F2F3F5';

/** 이슈 대표 이미지 (실제 업로드 전까지 목업 — 커뮤니티 썸네일과 동일 시드 규칙). */
export const issueThumb = (id: number) => `https://picsum.photos/seed/todaylove-issue${id}/600/360`;

export function IssueCard() {
  const { token } = useAuth();
  const router = useRouter();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setIssue((await getTodayIssue(token)).issue);
    } catch {
      setIssue(null);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!issue) return null;
  const voted = issue.my_vote != null;

  async function onVote(side: 'a' | 'b') {
    if (!token || busy || voted || !issue) return;
    setBusy(true);
    try {
      setIssue((await voteIssue(issue.id, side, token)).issue);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 409)) load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      {/* 뉴스 히어로 이미지 */}
      <Pressable onPress={() => router.push({ pathname: '/issue/[id]', params: { id: issue.id } })}>
        <Image source={{ uri: issueThumb(issue.id) }} style={styles.hero} />
        <View style={styles.kicker}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>연애이슈</Text>
          </View>
          {issue.source ? <Text style={styles.media}>{issue.source}</Text> : null}
        </View>
        <Text style={styles.title} numberOfLines={2}>{issue.title}</Text>
        <Text style={styles.summary} numberOfLines={3}>{issue.summary}</Text>
      </Pressable>
      {(issue.source || issue.url) && (
        <Pressable
          onPress={() => issue.url && WebBrowser.openBrowserAsync(issue.url)}
          hitSlop={6}
          disabled={!issue.url}>
          <Text style={styles.source}>{issue.source ?? '출처'} · 원문 보기 ↗</Text>
        </Pressable>
      )}

      {/* 부가 반응 투표 — 오늘의 질문(가득찬 rose/blue)과 달리 칼럼 하단 아웃라인 스타일 */}
      <View style={styles.pollBox}>
        <Text style={styles.pollLabel}>이 이슈, 당신의 생각은?</Text>
        {!voted ? (
          <View style={styles.vs}>
            <Pressable style={styles.choice} onPress={() => onVote('a')}>
              <Text style={styles.choiceText}>{issue.poll.a_label}</Text>
            </Pressable>
            <Pressable style={styles.choice} onPress={() => onVote('b')}>
              <Text style={styles.choiceText}>{issue.poll.b_label}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.result}>
            <ResultBar label={issue.poll.a_label} pct={issue.poll.a_pct} tone={colors.rose} mine={issue.my_vote === 'a'} />
            <ResultBar label={issue.poll.b_label} pct={100 - issue.poll.a_pct} tone={colors.blue} mine={issue.my_vote === 'b'} />
            <Text style={styles.participants}>{issue.poll.total.toLocaleString()}명 참여</Text>
          </View>
        )}
      </View>

      <Pressable style={styles.footer} onPress={() => router.push({ pathname: '/issue/[id]', params: { id: issue.id } })} hitSlop={6}>
        <Text style={styles.footerText}>댓글 {issue.comment_count}</Text>
      </Pressable>
    </View>
  );
}

function ResultBar({ label, pct, tone, mine }: { label: string; pct: number; tone: string; mine: boolean }) {
  return (
    <View style={styles.resultRow}>
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
  card: {
    backgroundColor: colors.bg,
    borderWidth: 0.5,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  hero: { width: '100%', height: 168, borderRadius: 14, backgroundColor: colors.soft },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  badge: { backgroundColor: colors.roseBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10.5, fontWeight: weight.bold as '700', color: colors.rose },
  media: { fontSize: 11.5, fontWeight: weight.semibold as '600', color: colors.sub },
  title: { fontSize: 16, fontWeight: weight.extrabold as '800', color: colors.ink, lineHeight: 23, marginTop: 8 },
  summary: { fontSize: 13, color: BODY, lineHeight: 20, marginTop: 7 },
  source: { fontSize: 11.5, color: colors.sub, marginTop: 10 },
  pollBox: { marginTop: 14, backgroundColor: colors.soft, borderRadius: 12, padding: 12 },
  pollLabel: { fontSize: 12, fontWeight: weight.bold as '700', color: colors.body, marginBottom: 10 },
  vs: { flexDirection: 'row', gap: 10 },
  choice: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: '#E3E6EA',
  },
  choiceText: { fontSize: 13, fontWeight: weight.bold as '700', color: colors.body },
  result: { gap: 10 },
  resultRow: { gap: 5 },
  resultHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultLabel: { fontSize: 12, fontWeight: weight.semibold as '600', color: BODY },
  resultPct: { fontSize: 12, fontWeight: weight.bold as '700', color: colors.ink },
  track: { height: 8, borderRadius: 5, backgroundColor: TRACK, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  participants: { fontSize: 11.5, color: colors.sub2, marginTop: 2 },
  footer: { marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: colors.line },
  footerText: { fontSize: 12.5, fontWeight: '500', color: BODY },
});

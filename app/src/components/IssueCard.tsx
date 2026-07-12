/** 오늘의 연애 이슈 카드 (DESIGN_UPDATE §5, 피드 헤더·데일리 폴 아래). */
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { getTodayIssue, voteIssue, type Issue } from '@/api/issues';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { colors, weight } from '@/theme';

const BODY = '#4E5968';
const TRACK = '#F2F3F5';

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
      <Text style={styles.label}>오늘의 연애 이슈</Text>
      <Text style={styles.title} numberOfLines={2}>{issue.title}</Text>
      <Text style={styles.summary} numberOfLines={2}>{issue.summary}</Text>
      {(issue.source || issue.url) && (
        <Pressable
          onPress={() => issue.url && WebBrowser.openBrowserAsync(issue.url)}
          hitSlop={6}
          disabled={!issue.url}>
          <Text style={styles.source}>
            {issue.source ?? '출처'} · 원문 보기 ↗
          </Text>
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
          <ResultBar label={issue.poll.a_label} pct={issue.poll.a_pct} tone={colors.rose} mine={issue.my_vote === 'a'} />
          <ResultBar label={issue.poll.b_label} pct={100 - issue.poll.a_pct} tone={colors.blue} mine={issue.my_vote === 'b'} />
          <Text style={styles.participants}>{issue.poll.total.toLocaleString()}명 참여</Text>
        </View>
      )}

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
  label: { fontSize: 11.5, fontWeight: weight.bold as '700', color: colors.sub },
  title: { fontSize: 14, fontWeight: weight.semibold as '600', color: colors.ink, lineHeight: 21, marginTop: 8 },
  summary: { fontSize: 12.5, color: BODY, lineHeight: 19, marginTop: 6 },
  source: { fontSize: 11.5, color: colors.sub, marginTop: 8 },
  vs: { flexDirection: 'row', gap: 10, marginTop: 12 },
  vsBtn: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  vsText: { color: '#fff', fontSize: 13, fontWeight: weight.bold as '700' },
  result: { marginTop: 12, gap: 10 },
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

/** 오늘의 질문 = 커뮤니티 A/B 데일리 폴 카드 (DESIGN_UPDATE §3, 피드 최상단 헤더). */
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { getDailyPoll, voteDailyPoll, type DailyPollData, type DailyPollToday, type PollSide } from '@/api/dailyPoll';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { colors, weight } from '@/theme';

const BORDER = '#E3E6EA';
const TRACK = '#F2F3F5';
const FILL: Record<PollSide, string> = { a: colors.rose, b: colors.blue, c: colors.navy };

export function DailyPollCard() {
  const { token } = useAuth();
  const [data, setData] = useState<DailyPollToday | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await getDailyPoll(token));
    } catch {
      setData(null);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const poll = data?.poll;
  if (!poll) return null; // 활성 폴 없으면 미노출

  const voted = poll.my_vote != null;

  async function onVote(side: PollSide) {
    if (!token || busy || voted) return;
    setBusy(true);
    try {
      const r = await voteDailyPoll(side, token);
      setData((d) => (d ? { ...d, poll: r.poll } : d));
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 409)) {
        // 중복 외 실패는 조용히
      }
      load();
    } finally {
      setBusy(false);
    }
  }

  const isVS = poll.choices.length === 2;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>오늘의 질문</Text>
      <Text style={styles.question}>{poll.question}</Text>

      {!voted ? (
        <View style={[styles.choices, isVS ? styles.choicesRow : styles.choicesCol]}>
          {poll.choices.map((c) => (
            <Pressable
              key={c.side}
              style={
                isVS
                  ? [styles.vsBtn, { backgroundColor: c.side === 'a' ? colors.rose : colors.blue }]
                  : styles.colBtn
              }
              onPress={() => onVote(c.side)}>
              <Text style={isVS ? styles.vsText : styles.colText}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <PollResult poll={poll} />
      )}

      {data.past.length > 0 && (
        <>
          <Pressable onPress={() => setShowPast((v) => !v)} hitSlop={6}>
            <Text style={styles.pastLink}>{showPast ? '지난 질문 접기' : '지난 질문 보기'}</Text>
          </Pressable>
          {showPast && (
            <View style={styles.pastList}>
              {data.past.map((p) => (
                <Text key={p.id} style={styles.pastItem} numberOfLines={1}>
                  {p.question}  ·  {p.top_label} {p.top_pct}%
                </Text>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function PollResult({ poll }: { poll: DailyPollData }) {
  const partnerLabel = poll.partner_vote
    ? poll.choices.find((c) => c.side === poll.partner_vote)?.label
    : null;
  return (
    <View style={styles.result}>
      {poll.choices.map((c) => (
        <View key={c.side} style={styles.resultRow}>
          <View style={styles.resultHead}>
            <Text style={[styles.resultLabel, c.side === poll.my_vote && { color: FILL[c.side] }]}>
              {c.label}
              {c.side === poll.my_vote ? ' · 내 선택' : ''}
            </Text>
            <Text style={styles.resultPct}>{c.pct}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${c.pct}%`, backgroundColor: FILL[c.side] }]} />
          </View>
        </View>
      ))}
      <Text style={styles.participants}>
        {poll.total.toLocaleString()}명 참여
        {partnerLabel ? `  ·  상대는 '${partnerLabel}' 선택` : ''}
      </Text>
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
    marginTop: 4,
  },
  label: { fontSize: 11.5, fontWeight: weight.bold as '700', color: colors.sub },
  question: { fontSize: 14, fontWeight: weight.semibold as '600', color: colors.ink, lineHeight: 22, marginTop: 8 },
  choices: { marginTop: 11 },
  choicesRow: { flexDirection: 'row', gap: 10 },
  choicesCol: { gap: 8 },
  vsBtn: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  vsText: { color: '#fff', fontSize: 13, fontWeight: weight.bold as '700' },
  colBtn: { backgroundColor: colors.soft, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  colText: { fontSize: 13, fontWeight: weight.semibold as '600', color: colors.ink },
  result: { marginTop: 11, gap: 10 },
  resultRow: { gap: 5 },
  resultHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultLabel: { fontSize: 12, fontWeight: weight.semibold as '600', color: colors.body },
  resultPct: { fontSize: 12, fontWeight: weight.bold as '700', color: colors.ink },
  track: { height: 8, borderRadius: 5, backgroundColor: TRACK, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  participants: { fontSize: 11.5, color: colors.sub2, marginTop: 2 },
  pastLink: { fontSize: 12, fontWeight: weight.semibold as '600', color: colors.sub, textDecorationLine: 'underline', marginTop: 14 },
  pastList: { marginTop: 8, gap: 6 },
  pastItem: { fontSize: 12, color: colors.sub },
});

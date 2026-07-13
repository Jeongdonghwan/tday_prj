/**
 * 투표 결과바 (공용) — 색 총량 규제: 카드당 유채색은 이 결과 1곳만.
 * 우세 세그먼트만 로즈, 열세/동률은 뉴트럴 그레이. 라벨은 퍼센트만 표기, 내 투표엔 ✓.
 * 피드 카드(PostCard)와 글 상세(post/[id]) 양쪽에서 동일 규칙으로 사용.
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors, weight } from '@/theme';

type Props = {
  aLabel: string;
  bLabel: string;
  aPct: number; // 0~100 (A 득표율)
  total?: number;
  myVote?: 'A' | 'B' | null;
};

export function PollResultBar({ aLabel, bLabel, aPct, total, myVote }: Props) {
  const bPct = 100 - aPct;
  const tie = aPct === 50;
  const aWin = aPct > 50;
  const bWin = aPct < 50;

  return (
    <View style={styles.wrap}>
      {/* 라벨 행: 좌 A / 우 B, 퍼센트만 */}
      <View style={styles.labels}>
        <SideLabel label={aLabel} pct={aPct} win={aWin} tie={tie} mine={myVote === 'A'} align="left" />
        <SideLabel label={bLabel} pct={bPct} win={bWin} tie={tie} mine={myVote === 'B'} align="right" />
      </View>

      {/* 결과 바: 두 세그먼트 + 2px 갭 */}
      <View style={styles.track}>
        {aPct > 0 && (
          <View style={[styles.seg, { flexGrow: aPct, backgroundColor: aWin ? colors.rose : colors.neutralBar }]} />
        )}
        {bPct > 0 && (
          <View style={[styles.seg, { flexGrow: bPct, backgroundColor: bWin ? colors.rose : colors.neutralBar }]} />
        )}
      </View>

      {typeof total === 'number' && (
        <Text style={styles.caption}>투표 · {total.toLocaleString()}명 참여</Text>
      )}
    </View>
  );
}

function SideLabel({
  label,
  pct,
  win,
  tie,
  mine,
  align,
}: {
  label: string;
  pct: number;
  win: boolean;
  tie: boolean;
  mine: boolean;
  align: 'left' | 'right';
}) {
  // 우세측: 라벨 700 잉크 + 퍼센트 로즈 / 열세측: 전체 그레이 / 동률: 라벨 그레이 + 퍼센트 잉크
  const labelColor = win ? colors.ink : colors.sub;
  const pctColor = win ? colors.rose : tie ? colors.ink : colors.sub;
  return (
    <Text style={[styles.label, align === 'right' && styles.right]} numberOfLines={1}>
      <Text style={[styles.labelText, { color: labelColor, fontWeight: (win ? weight.bold : weight.semibold) as '700' }]}>
        {label}{' '}
      </Text>
      <Text style={[styles.pctText, { color: pctColor }]}>{pct}%</Text>
      {mine ? <Text style={styles.check}> ✓</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7, gap: 12 },
  label: { flex: 1, fontSize: 12.5 },
  right: { textAlign: 'right' },
  labelText: { fontSize: 12.5 },
  pctText: { fontSize: 12.5, fontWeight: weight.bold as '700' },
  check: { fontSize: 10, color: colors.rose, fontWeight: weight.bold as '700' },
  track: { flexDirection: 'row', height: 8, gap: 2 },
  seg: { flexBasis: 0, borderRadius: 5 },
  caption: { fontSize: 11, color: colors.caption, marginTop: 7 },
});

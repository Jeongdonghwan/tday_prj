/** 공유용 캡처 카드 (FORTUNE_UPDATE.md §8). 화면 밖(off-screen)에 렌더해 view-shot 으로 캡처.
 *  자정 테마 그라데이션 + 점수/한줄 — 운세용/궁합용 2종. collapsable={false} 로 안드로이드 캡처 보장. */
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ScoreRing } from '@/components/fortune/ScoreRing';
import { nightGradient } from '@/fortune/theme';
import { weight } from '@/theme';

/** 오늘 연애운 공유 카드. */
export const FortuneShareCard = forwardRef<View, { nickname?: string; score: number; summary: string; dateLabel: string }>(
  function FortuneShareCard({ nickname, score, summary, dateLabel }, ref) {
    return (
      <View ref={ref} collapsable={false} style={styles.host}>
        <LinearGradient {...nightGradient} style={styles.card}>
          <Text style={styles.brand}>🌙 오늘연애 · {dateLabel}</Text>
          <View style={styles.row}>
            <ScoreRing size={104} stroke={8} score={score}>
              <Text style={styles.num}>{score}</Text>
              <Text style={styles.numLabel}>연애운</Text>
            </ScoreRing>
            <Text style={styles.oneline}>"{summary}"</Text>
          </View>
          <Text style={styles.foot}>{nickname ? `${nickname}님의 ` : ''}오늘 연애운 · todayloves.com</Text>
        </LinearGradient>
      </View>
    );
  },
);

/** 궁합 결과 공유 카드. */
export const CompatShareCard = forwardRef<View, { score: number; comment: string }>(
  function CompatShareCard({ score, comment }, ref) {
    return (
      <View ref={ref} collapsable={false} style={styles.host}>
        <LinearGradient {...nightGradient} style={styles.card}>
          <Text style={styles.brand}>💗 오늘의 궁합</Text>
          <Text style={styles.compScore}>{score}점</Text>
          <Text style={styles.compComment}>{comment}</Text>
          <Text style={styles.foot}>오늘연애 · todayloves.com</Text>
        </LinearGradient>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  // 캡처 대상만 필요 → 화면 밖으로 밀어 사용자에게 안 보이게(레이아웃엔 존재)
  host: { position: 'absolute', left: -9999, top: 0, width: 340 },
  card: { borderRadius: 24, padding: 26 },
  brand: { fontSize: 12, fontWeight: weight.bold as '700', letterSpacing: 1, color: 'rgba(255,255,255,0.7)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 18 },
  num: { color: '#fff', fontSize: 30, fontWeight: weight.extrabold as '800' },
  numLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: weight.semibold as '600', marginTop: 2 },
  oneline: { flex: 1, color: '#fff', fontSize: 17, fontWeight: weight.bold as '700', lineHeight: 24 },
  compScore: { color: '#fff', fontSize: 46, fontWeight: weight.extrabold as '800', marginTop: 14 },
  compComment: { color: 'rgba(255,255,255,0.9)', fontSize: 15, lineHeight: 22, marginTop: 6 },
  foot: { marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: weight.semibold as '600' },
});

/** 자정 운세 시그니처 카드 (fortune_tab.html). 잠금(미등록) blur+오버레이 / 전문 토글.
 *  desktop=true 면 전문 상시 노출(접기 없음), 링 110px. */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { FortuneToday } from '@/api/fortune';
import { ScoreRing } from '@/components/fortune/ScoreRing';
import { night, nightGradient } from '@/fortune/theme';
import { weight } from '@/theme';

export function NightCard({
  data,
  desktop = false,
}: {
  data: Extract<FortuneToday, { registered: true }>;
  desktop?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ringSize = desktop ? 110 : 96;

  return (
    <LinearGradient {...nightGradient} style={[styles.card, desktop && styles.cardPc]}>
      <Text style={styles.eyebrow}>{data.published ? "TODAY'S LOVE 운세" : '어제의 연애운'}</Text>
      <Text style={styles.who}>
        <Text style={styles.whoB}>{data.nickname}</Text>님 · {data.zodiac}띠 · {statusKo(data.love_status)}
      </Text>
      <View style={[styles.scoreRow, desktop && { gap: 26 }]}>
        <ScoreRing size={ringSize} stroke={desktop ? 8 : 7} score={data.score ?? 0}>
          <Text style={[styles.num, desktop && { fontSize: 32 }]}>{data.score}</Text>
          <Text style={styles.numLabel}>연애운 점수</Text>
        </ScoreRing>
        <Text style={[styles.oneline, desktop && { fontSize: 19 }]}>"{data.summary}"</Text>
      </View>

      {(desktop || open) && !!data.full_text && (
        <Text style={styles.fulltext}>{data.full_text}</Text>
      )}
      {!desktop && !!data.full_text && (
        <Pressable style={styles.more} onPress={() => setOpen((v) => !v)}>
          <Text style={styles.moreT}>{open ? '접기' : '운세 전문 보기'}</Text>
        </Pressable>
      )}
    </LinearGradient>
  );
}

/** 미등록 잠금 카드 — blur 흉내(더미 텍스트 + 반투명 오버레이). */
export function NightCardLocked({ onUnlock }: { onUnlock: () => void }) {
  return (
    <LinearGradient {...nightGradient} style={styles.card}>
      <View style={styles.lockedBody} pointerEvents="none">
        <Text style={styles.eyebrow}>TODAY'S LOVE 운세</Text>
        <Text style={styles.who}>매일 자정 · 나만의 연애운</Text>
        <View style={styles.scoreRow}>
          <ScoreRing size={96} stroke={7} score={0} dashed>
            <Text style={styles.num}>?</Text>
          </ScoreRing>
          <Text style={styles.oneline}>오늘 당신의 연애운이 준비되어 있어요</Text>
        </View>
      </View>
      <View style={styles.veil}>
        <Text style={styles.veilP}>내 연애운은 아직 잠겨 있어요</Text>
        <Text style={styles.veilS}>생년월일만 입력하면 매일 자정, 나만의 연애운을 받아요</Text>
        <Pressable style={styles.cta} onPress={onUnlock}>
          <Text style={styles.ctaT}>30초만에 내 연애운 열기</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

function statusKo(s?: string) {
  return s === 'solo' ? '솔로' : s === 'some' ? '썸 타는 중' : s === 'couple' ? '연애 중' : s === 'rebound' ? '재회희망' : '';
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 22, paddingBottom: 20, overflow: 'hidden', position: 'relative' },
  cardPc: { padding: 28, paddingHorizontal: 30 },
  eyebrow: { fontSize: 11, fontWeight: weight.bold as '700', letterSpacing: 1.7, color: 'rgba(255,255,255,0.55)' },
  who: { marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: weight.semibold as '600' },
  whoB: { color: '#fff', fontWeight: weight.bold as '700' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 16 },
  num: { color: '#fff', fontSize: 28, fontWeight: weight.extrabold as '800', lineHeight: 30 },
  numLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: weight.semibold as '600', marginTop: 2 },
  oneline: { flex: 1, color: '#fff', fontSize: 16, fontWeight: weight.bold as '700', lineHeight: 23 },
  fulltext: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', fontSize: 13.5, lineHeight: 23, color: 'rgba(255,255,255,0.85)' },
  more: { marginTop: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center' },
  moreT: { color: '#fff', fontSize: 13, fontWeight: weight.bold as '700' },
  lockedBody: { opacity: 0.35 },
  veil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(28,20,48,0.55)', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24, borderRadius: 20 },
  veilP: { color: '#fff', fontSize: 14, fontWeight: weight.bold as '700', textAlign: 'center' },
  veilS: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: weight.semibold as '600', textAlign: 'center' },
  cta: { marginTop: 4, backgroundColor: '#F23B5F', borderRadius: 999, paddingHorizontal: 22, paddingVertical: 11 },
  ctaT: { color: '#fff', fontSize: 13.5, fontWeight: weight.extrabold as '800' },
});

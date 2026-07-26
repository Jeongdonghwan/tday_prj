/** 홈 최상단 컴팩트 자정 운세 카드 (home_fortune.html). 등록/미등록 2상태.
 *  탭하면 오늘연애 탭(미등록은 온보딩) 이동. /fortune/today 는 FortuneContext 공유(중복호출 금지). */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { ScoreRing } from '@/components/fortune/ScoreRing';
import { useFortune } from '@/fortune/FortuneContext';
import { night, nightGradient } from '@/fortune/theme';
import { weight } from '@/theme';

export function HomeFortuneCard() {
  const router = useRouter();
  const { token } = useAuth();
  const { data, reload } = useFortune();

  useEffect(() => {
    if (token && !data) reload();
  }, [token, data, reload]);

  if (!token) return null; // 게스트는 미노출(홈 게스트 처리 별도)

  const registered = data?.registered === true;

  const onPress = () => {
    if (registered) router.navigate('/fortune');
    else router.push('/fortune-onboarding');
  };

  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <LinearGradient {...nightGradient} style={styles.card}>
        {!registered && <View style={styles.newChip}><Text style={styles.newChipT}>NEW</Text></View>}
        <View style={styles.row}>
          <ScoreRing size={64} stroke={6} score={registered ? (data as any).score ?? 0 : 0} dashed={!registered}>
            <Text style={styles.num}>{registered ? (data as any).score : '?'}</Text>
          </ScoreRing>
          <View style={styles.tx}>
            <Text style={styles.eb}>🌙 오늘의 연애운</Text>
            <Text style={styles.line} numberOfLines={2}>
              {registered ? (data as any).summary : '매일 자정, 나만의 연애운이 도착해요'}
            </Text>
            <View style={styles.go}>
              <Text style={styles.goT}>
                {registered ? '전체 운세 · 타로 · 궁합 보기' : '30초만에 내 연애운 열기'}
              </Text>
              <Icon name="chevronRight" size={12} color={night.gold} strokeWidth={2.5} />
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 2 },
  card: { borderRadius: 18, padding: 16, overflow: 'hidden' },
  newChip: { position: 'absolute', top: 12, right: 14, backgroundColor: '#F23B5F', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  newChipT: { color: '#fff', fontSize: 10, fontWeight: weight.extrabold as '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  num: { color: '#fff', fontSize: 20, fontWeight: weight.extrabold as '800' },
  tx: { flex: 1, minWidth: 0 },
  eb: { fontSize: 10, fontWeight: weight.bold as '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.55)' },
  line: { fontSize: 14, fontWeight: weight.bold as '700', lineHeight: 20, color: '#fff', marginTop: 4 },
  go: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 7 },
  goT: { fontSize: 11.5, fontWeight: weight.bold as '700', color: night.gold },
});

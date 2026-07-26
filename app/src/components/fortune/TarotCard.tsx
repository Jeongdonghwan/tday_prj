/** 오늘의 타로 — 탭하면 뒤집혀 카드 공개 (fortune_tab.html). 하루 1회(자정 리셋은 서버 tarot_index).
 *  RN 3D flip 대신 탭 시 앞/뒷면 크로스페이드(reduced-motion 안전). */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { Tarot } from '@/api/fortune';
import { Icon } from '@/components/Icon';
import { night } from '@/fortune/theme';
import { colors, weight } from '@/theme';

export function TarotCard({ tarot, onShare }: { tarot: Tarot; onShare?: () => void }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.card} onPress={() => setFlipped(true)}>
        {flipped ? (
          <View style={[styles.face, styles.front]}>
            <Icon name="fire" size={30} color={colors.rose} />
            <Text style={styles.frontName}>{tarot.name_kr}</Text>
            <Text style={styles.frontEn}>{tarot.name_en}</Text>
          </View>
        ) : (
          <LinearGradient colors={[night.g1, night.g3]} style={[styles.face, styles.back]}>
            <Icon name="info" size={26} color={night.gold} />
            <Text style={styles.tap}>TAP</Text>
          </LinearGradient>
        )}
      </Pressable>
      <View style={styles.info}>
        {flipped ? (
          <>
            <Text style={styles.h4}>{tarot.name_kr} · {tarot.name_en}</Text>
            <Text style={styles.p}>{tarot.meaning}</Text>
            {onShare && (
              <Pressable onPress={onShare}><Text style={styles.hint}>카드 결과 공유하기 →</Text></Pressable>
            )}
          </>
        ) : (
          <>
            <Text style={styles.h4}>마음속 질문 하나를 떠올리고{'\n'}카드를 눌러보세요</Text>
            <Text style={styles.p}>자정에 새로운 카드가 준비돼요. 오늘 카드가 전하는 연애 조언을 확인해보세요.</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
  card: { width: 86, height: 128 },
  face: { width: 86, height: 128, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 6 },
  back: { borderWidth: 1.5, borderColor: 'rgba(245,195,107,0.4)' },
  front: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.rose },
  tap: { color: night.gold, fontSize: 10, fontWeight: weight.bold as '700', letterSpacing: 1.2 },
  frontName: { fontSize: 13, fontWeight: weight.extrabold as '800', color: colors.ink },
  frontEn: { fontSize: 9, fontWeight: weight.bold as '700', color: colors.rose },
  info: { flex: 1 },
  h4: { fontSize: 14, fontWeight: weight.extrabold as '800', color: colors.ink, letterSpacing: -0.2, lineHeight: 19 },
  p: { fontSize: 12.5, color: colors.sub, lineHeight: 18, marginTop: 5 },
  hint: { marginTop: 8, fontSize: 11, fontWeight: weight.bold as '700', color: colors.rose },
});

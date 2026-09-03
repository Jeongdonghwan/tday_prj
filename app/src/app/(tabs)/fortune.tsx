/** 오늘연애 탭 (fortune_tab.html 11섹션). 잠금/해제, 타로, 궁합, 오늘의 질문(DailyPollCard 재배치). */
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCompatibility, readFortune, type FortuneToday } from '@/api/fortune';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { DailyPollCard } from '@/components/DailyPollCard';
import { Icon } from '@/components/Icon';
import { NightCard, NightCardLocked } from '@/components/fortune/NightCard';
import { CompatShareCard, FortuneShareCard } from '@/components/fortune/ShareCard';
import { TarotCard } from '@/components/fortune/TarotCard';
import { useFortune } from '@/fortune/FortuneContext';
import { shareCardImage } from '@/fortune/shareCard';
import { night } from '@/fortune/theme';
import { useIsDesktop } from '@/hooks/useResponsive';
import { notify, requireLogin } from '@/lib/dialogs';
import { shareUrl } from '@/lib/share';
import { WEB_BASE_URL } from '@/api/tests';
import { colors, radius, weight } from '@/theme';

function todayLabel(iso?: string) {
  const d = iso ? new Date(iso + 'T00:00:00') : new Date();
  const wk = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${wk}요일`;
}

export default function FortuneScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { data, loading, reload } = useFortune();

  useFocusEffect(
    useCallback(() => {
      if (token) {
        reload();
        readFortune(token).catch(() => {});
      }
    }, [token, reload]),
  );

  if (!token) {
    // 게스트(웹): 잠긴 자정 카드 미리보기 — CTA 는 로그인으로 (유입 퍼널)
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppBar title="오늘연애" />
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={{ paddingTop: 8 }}>
            <View style={styles.datebar}>
              <Text style={styles.dbD}>{todayLabel()}</Text>
            </View>
            <View style={{ marginHorizontal: 16 }}>
              <NightCardLocked onUnlock={() => router.push('/(auth)/login')} />
            </View>
            <Text style={styles.guestHint}>내 생년월일·연애 상태에 맞춘 <Text style={{ fontWeight: '800', color: colors.ink }}>맞춤 운세로 보려면 로그인</Text>이 필요해요{'
'}매일 자정 연애운·타로·궁합 — 무료</Text>
            <Text style={styles.disclaimer}>운세 콘텐츠는 재미로 즐기는 참고용 정보예요.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const registered = data?.registered === true;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar title="오늘연애" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
<ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {loading && !data ? (
          <ActivityIndicator color={colors.rose} style={{ marginTop: 60 }} />
        ) : !registered ? (
          <View style={{ paddingTop: 8 }}>
            <View style={styles.datebar}>
              <Text style={styles.dbD}>{todayLabel()}</Text>
            </View>
            <View style={{ marginHorizontal: 16 }}>
              <NightCardLocked onUnlock={() => router.push('/fortune-onboarding')} />
            </View>
            <Text style={styles.disclaimer}>운세 콘텐츠는 재미로 즐기는 참고용 정보예요.</Text>
          </View>
        ) : (
          <Registered data={data as Extract<FortuneToday, { registered: true }>} token={token} />
        )}
      </ScrollView>
</KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Registered({ data, token }: { data: Extract<FortuneToday, { registered: true }>; token: string }) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const shareRef = useRef<View>(null);
  const shareMsg = `오늘 내 연애운 ${data.score}점! "${data.summary}"`;
  if (data.unavailable) {
    return (
      <View style={{ paddingTop: 8 }}>
        <View style={styles.datebar}><Text style={styles.dbD}>{todayLabel(data.date)}</Text></View>
        <Text style={styles.disclaimer}>오늘의 운세를 준비 중이에요. 자정에 다시 확인해주세요.</Text>
      </View>
    );
  }
  return (
    <View style={{ paddingTop: 8 }}>
      {/* 1. 날짜바 */}
      <View style={styles.datebar}>
        <Text style={styles.dbD}>{todayLabel(data.date)}</Text>
        {data.published && <Text style={styles.dbU}>🌙 자정 업데이트 완료</Text>}
      </View>

      {/* 2. 자정 카드 (데스크톱: 전문 상시 노출, 링 110) */}
      <View style={{ marginHorizontal: 16 }}><NightCard data={data} desktop={isDesktop} /></View>

      {/* 3. 항목별 연애운 (데스크톱: 3열 그리드) */}
      <Section title="항목별 연애운">
        <View style={isDesktop ? styles.catGrid : { gap: 8 }}>
          {data.cats?.map((c, i) => (
            <View key={i} style={isDesktop ? styles.catCell : undefined}>
              <CatRow name={c.name} comment={c.comment} score={c.score} idx={i} />
            </View>
          ))}
        </View>
      </Section>

      {/* 4. 오늘의 행운 */}
      <Section title="오늘의 행운">
        <View style={styles.lucky}>
          {data.lucky && [
            { ...data.lucky.color, label: '행운의 색' },
            { ...data.lucky.item, label: '행운의 아이템' },
            { ...data.lucky.time, label: '행운의 시간' },
            { ...data.lucky.place, label: '행운의 장소' },
          ].map((l, i) => (
            <View key={i} style={styles.lk}>
              <Text style={styles.lkE}>{l.emoji}</Text>
              <Text style={styles.lkB}>{l.name}</Text>
              <Text style={styles.lkS}>{l.label}</Text>
            </View>
          ))}
        </View>
      </Section>

      {/* 5. 타로 */}
      <Section title="오늘의 타로 한 장" right="하루 1회">
        {data.tarot && (
          <TarotCard tarot={data.tarot} onShare={() => shareUrl(`${WEB_BASE_URL}/`, `오늘 내 타로는 ${data.tarot!.name_kr}!`)} />
        )}
      </Section>

      {/* 6. 궁합 */}
      <Section>
        <CompatBox token={token} />
      </Section>

      {/* 7. 오늘의 질문 (재배치) */}
      <View style={{ marginTop: 22 }}><DailyPollCard /></View>

      {/* 8. 공유 CTA (카드 이미지 캡처 → 실패 시 링크 폴백) */}
      <Section>
        <Pressable style={styles.share} onPress={() => shareCardImage(shareRef, `${WEB_BASE_URL}/`, shareMsg)}>
          <Icon name="share" size={22} color="#191919" />
          <View style={{ flex: 1 }}>
            <Text style={styles.shareB}>내 연애운 카드 공유하기</Text>
            <Text style={styles.shareS}>친구에게 오늘의 운세를 보내보세요</Text>
          </View>
        </Pressable>
      </Section>

      {/* off-screen 캡처 카드 */}
      <FortuneShareCard ref={shareRef} nickname={data.nickname} score={data.score ?? 0} summary={data.summary ?? ''} dateLabel={todayLabel(data.date)} />

      {/* 9. 스트릭 */}
      <Section>
        <View style={styles.streak}>
          <View>
            <Text style={styles.streakB}>🔥 {data.streak ?? 0}일 연속 확인 중</Text>
            <Text style={styles.streakS}>7일 연속이면 특별 배지를 드려요</Text>
          </View>
          <View style={styles.dots}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View key={i} style={[styles.dot, i < Math.min(data.streak ?? 0, 7) && styles.dotOn]} />
            ))}
          </View>
        </View>
      </Section>

      {/* 10. 데일리 스레드 (thread_id 있을 때만 노출) */}
      {data.thread_id != null && (
        <Section>
          <Pressable style={styles.thread} onPress={() => router.push({ pathname: '/post/[id]', params: { id: data.thread_id! } })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.threadB}>💬 오늘 운세, 실제로 맞았어요?</Text>
              <Text style={styles.threadS}>매일 자정 열리는 운세 후기 스레드</Text>
            </View>
            <Text style={styles.threadGo}>참여하기</Text>
          </Pressable>
        </Section>
      )}

      {/* 11. 면책 */}
      <Text style={styles.disclaimer}>운세 콘텐츠는 재미로 즐기는 참고용 정보예요.</Text>
    </View>
  );
}

function Section({ title, right, children }: { title?: string; right?: string; children: React.ReactNode }) {
  return (
    <View style={styles.sec}>
      {title && (
        <View style={styles.secH}>
          <Text style={styles.secTitle}>{title}</Text>
          {right && <Text style={styles.secRight}>{right}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

function CatRow({ name, comment, score, idx }: { name: string; comment: string; score: number | null; idx: number }) {
  const isWarn = score === null;
  const tint = isWarn ? night.amber : idx === 1 ? night.blue : colors.rose;
  return (
    <View style={styles.cat}>
      <View style={[styles.catIc, { backgroundColor: isWarn ? '#FFF6E8' : idx === 1 ? '#EEF3FE' : colors.roseBg }]}>
        <Icon name={isWarn ? 'info' : 'heart'} size={16} color={tint} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.catName}>{name}</Text>
        <Text style={styles.catComment} numberOfLines={1}>{comment}</Text>
      </View>
      <View style={styles.bar}>
        <View style={styles.track}><View style={[styles.fill, { width: `${isWarn ? 34 : score}%`, backgroundColor: tint }]} /></View>
        <Text style={[styles.barEm, { color: tint }]}>{isWarn ? '주의' : score}</Text>
      </View>
    </View>
  );
}

function CompatBox({ token }: { token: string }) {
  const [birth, setBirth] = useState('');
  const [result, setResult] = useState<{ score: number; comment: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const compatRef = useRef<View>(null);

  async function onCheck() {
    if (!token) return requireLogin();
    const iso = birth.replace(/[.\s]/g, '-').replace(/-+/g, '-');
    if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(iso)) {
      notify('궁합', '생년월일을 예: 1998.03.14 형식으로 입력해주세요.');
      return;
    }
    setBusy(true);
    try {
      const [y, m, d] = iso.split('-');
      const norm = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      setResult(await getCompatibility(norm, token));
    } catch {
      notify('궁합', '궁합을 불러오지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.comp}>
      <Text style={styles.compH}>💗 그 사람과 오늘의 궁합은?</Text>
      <Text style={styles.compP}>상대방 생년월일만 입력하면 오늘의 궁합 점수를 알려드려요</Text>
      <View style={styles.compRow}>
        <TextInput
          style={styles.compInput}
          placeholder="상대방 생년월일 (예: 1998.03.14)"
          placeholderTextColor={colors.sub2}
          value={birth}
          onChangeText={setBirth}
          keyboardType="numbers-and-punctuation"
        />
        <Pressable style={styles.compBtn} disabled={busy} onPress={onCheck}>
          <Text style={styles.compBtnT}>{busy ? '...' : '궁합 보기'}</Text>
        </Pressable>
      </View>

      <Modal visible={!!result} transparent animationType="fade" onRequestClose={() => setResult(null)}>
        <Pressable style={styles.modalBg} onPress={() => setResult(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalScore}>{result?.score}점</Text>
            <Text style={styles.modalComment}>{result?.comment}</Text>
            <Pressable
              style={styles.modalShare}
              onPress={() => shareCardImage(compatRef, `${WEB_BASE_URL}/`, `오늘 우리 궁합 ${result?.score}점! ${result?.comment}`)}>
              <Text style={styles.modalShareT}>결과 카드 공유하기</Text>
            </Pressable>
            <Pressable onPress={() => setResult(null)}><Text style={styles.modalClose}>닫기</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      {result && <CompatShareCard ref={compatRef} score={result.score} comment={result.comment} />}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  guide: { fontSize: 14, color: colors.sub, textAlign: 'center' },
  guideBtn: { backgroundColor: colors.rose, borderRadius: radius.input, paddingVertical: 14, paddingHorizontal: 40 },
  guideBtnT: { color: '#fff', fontSize: 15, fontWeight: weight.bold as '700' },
  datebar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingBottom: 12 },
  dbD: { fontSize: 13, fontWeight: weight.bold as '700', color: colors.ink },
  dbU: { fontSize: 11, fontWeight: weight.semibold as '600', color: colors.rose, backgroundColor: colors.roseBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  sec: { marginHorizontal: 16, marginTop: 22 },
  secH: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  secTitle: { fontSize: 15, fontWeight: weight.extrabold as '800', color: colors.ink, letterSpacing: -0.2 },
  secRight: { fontSize: 12, color: colors.sub2, fontWeight: weight.semibold as '600' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catCell: { width: '32%', flexGrow: 1 },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.line, borderRadius: radius.card, padding: 12 },
  catIc: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 13.5, fontWeight: weight.bold as '700', color: colors.ink },
  catComment: { fontSize: 12, color: colors.sub, marginTop: 2 },
  bar: { width: 56 },
  track: { height: 5, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  barEm: { textAlign: 'right', fontSize: 11, fontWeight: weight.extrabold as '800', marginTop: 3 },
  lucky: { flexDirection: 'row', gap: 8 },
  lk: { flex: 1, backgroundColor: colors.roseBg, borderRadius: radius.card, paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center' },
  lkE: { fontSize: 20 },
  lkB: { fontSize: 12, fontWeight: weight.bold as '700', marginTop: 5, letterSpacing: -0.2, color: colors.ink },
  lkS: { fontSize: 10, color: colors.sub2, fontWeight: weight.semibold as '600', marginTop: 1 },
  comp: { backgroundColor: '#FFF3F5', borderRadius: radius.cardLg, padding: 18 },
  compH: { fontSize: 14.5, fontWeight: weight.extrabold as '800', color: colors.ink },
  compP: { fontSize: 12.5, color: colors.sub, marginTop: 4 },
  compRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  compInput: { flex: 1, borderWidth: 1, borderColor: '#F6C9D3', borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 13.5, backgroundColor: '#fff', color: colors.ink },
  compBtn: { paddingHorizontal: 18, height: 46, borderRadius: 12, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' },
  compBtnT: { color: '#fff', fontSize: 13.5, fontWeight: weight.extrabold as '800' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 26, width: '100%', maxWidth: 340, alignItems: 'center', gap: 10 },
  modalScore: { fontSize: 40, fontWeight: weight.extrabold as '800', color: colors.rose },
  modalComment: { fontSize: 14, color: colors.ink, textAlign: 'center', lineHeight: 21 },
  modalShare: { marginTop: 8, backgroundColor: '#FEE500', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  modalShareT: { color: '#191919', fontSize: 14, fontWeight: weight.bold as '700' },
  modalClose: { marginTop: 6, fontSize: 13, color: colors.sub2, fontWeight: weight.semibold as '600' },
  share: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FEE500', borderRadius: radius.cardLg, padding: 14 },
  shareB: { fontSize: 13.5, fontWeight: weight.extrabold as '800', color: '#191919' },
  shareS: { fontSize: 11.5, color: 'rgba(25,25,25,0.65)', fontWeight: weight.semibold as '600', marginTop: 2 },
  streak: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.line, borderRadius: radius.cardLg, padding: 14 },
  streakB: { fontSize: 13.5, fontWeight: weight.extrabold as '800', color: colors.ink },
  streakS: { fontSize: 11.5, color: colors.sub2, fontWeight: weight.semibold as '600', marginTop: 2 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.rose },
  thread: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#F0AEBE', borderRadius: radius.cardLg, paddingVertical: 13, paddingHorizontal: 16, backgroundColor: '#FFF9FA' },
  threadB: { fontSize: 13, fontWeight: weight.extrabold as '800', color: colors.ink },
  threadS: { fontSize: 11.5, color: colors.sub2, fontWeight: weight.semibold as '600', marginTop: 2 },
  threadGo: { color: colors.rose, fontWeight: weight.extrabold as '800', fontSize: 12 },
  guestHint: { marginTop: 14, marginHorizontal: 24, fontSize: 12.5, color: colors.sub, textAlign: 'center', lineHeight: 18 },
  disclaimer: { marginTop: 20, marginHorizontal: 16, fontSize: 10.5, color: colors.sub2, textAlign: 'center' },
});

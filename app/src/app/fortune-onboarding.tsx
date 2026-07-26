/** 운세 프로필 온보딩 4스텝 (fortune_onboarding.html).
 *  STEP1 생년월일+태어난시 → STEP2 성별 → STEP3 연애상태 → STEP4 푸시 프라이머.
 *  "자정에 알림 받기" 탭 이후에만 OS 권한 요청(registerForPush). "알림 없이"는 권한 요청 없이 통과. */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { saveFortuneProfile, type LoveStatus, type PushTime } from '@/api/fortune';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { useFortune } from '@/fortune/FortuneContext';
import { night, nightGradient } from '@/fortune/theme';
import { notify } from '@/lib/dialogs';
import { registerForPush } from '@/push/registerPush';
import { colors, radius, weight } from '@/theme';

const NOW_Y = new Date().getFullYear();
const YEARS = Array.from({ length: 80 }, (_, i) => NOW_Y - 14 - i); // 만 14세 이상
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const SIJIN = ['자시(23~01시)', '축시(01~03시)', '인시(03~05시)', '묘시(05~07시)', '진시(07~09시)', '사시(09~11시)', '오시(11~13시)', '미시(13~15시)', '신시(15~17시)', '유시(17~19시)', '술시(19~21시)', '해시(21~23시)'];
const STATUSES: { key: LoveStatus; emoji: string; label: string; desc: string }[] = [
  { key: 'solo', emoji: '🌱', label: '솔로', desc: '만남운 · 고백운을 알려드려요' },
  { key: 'some', emoji: '💌', label: '썸 타는 중', desc: '진전운 · 연락운을 알려드려요' },
  { key: 'couple', emoji: '💗', label: '연애 중', desc: '데이트운 · 다툼주의보를 알려드려요' },
  { key: 'rebound', emoji: '🌙', label: '다시 만나고 싶어요', desc: '재회운 · 인연운을 알려드려요' },
];

export default function FortuneOnboarding() {
  const router = useRouter();
  const { token } = useAuth();
  const { setData } = useFortune();
  const [step, setStep] = useState(1);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [timeIdx, setTimeIdx] = useState<number | null>(null);
  const [noTime, setNoTime] = useState(false);
  const [gender, setGender] = useState<'F' | 'M' | null>(null);
  const [status, setStatus] = useState<LoveStatus | null>(null);
  const [pushTime, setPushTime] = useState<PushTime>('00');
  const [saving, setSaving] = useState(false);

  const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 31;
  const DAYS = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const step1ok = year && month && day && (noTime || timeIdx !== null);

  function skip() {
    router.back(); // 잠금 상태 유지
  }

  async function finish(pushEnabled: boolean) {
    if (!token || !year || !month || !day || !gender || !status) return;
    if (pushEnabled) {
      try { await registerForPush(token); } catch { /* 권한 거부해도 진행 */ }
    }
    setSaving(true);
    try {
      const birth = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const res = await saveFortuneProfile(
        { birth_date: birth, birth_time: noTime ? null : timeIdx, gender, love_status: status, push_enabled: pushEnabled, push_time: pushTime },
        token,
      );
      setData(res);
      router.replace('/fortune');
    } catch {
      notify('운세 프로필', '저장에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  // STEP 4 (푸시 프라이머) — 다크 화면
  if (step === 4) {
    return (
      <LinearGradient {...nightGradient} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <Top onBack={() => setStep(3)} onSkip={skip} dark />
          <Prog step={4} />
          <View style={styles.pushBody}>
            <View style={styles.moon}><Text style={{ fontSize: 46 }}>🌙</Text></View>
            <Text style={styles.pushH}>매일 자정,{'\n'}가장 먼저 알려드릴까요?</Text>
            <Text style={styles.pushSub}>운세가 공개되는 순간 푸시로 보내드려요.{'\n'}알림 시간은 취향대로 바꿀 수 있어요.</Text>
            <View style={styles.times}>
              {([['00', '자정 00시', '공개 즉시'], ['07', '아침 7시', '기상 알림'], ['09', '아침 9시', '하루 시작']] as const).map(([v, t, s]) => (
                <Pressable key={v} style={[styles.time, pushTime === v && styles.timeOn]} onPress={() => setPushTime(v)}>
                  <Text style={[styles.timeT, pushTime === v && { color: '#fff' }]}>{t}</Text>
                  <Text style={[styles.timeS, pushTime === v && { color: 'rgba(255,255,255,0.85)' }]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.foot}>
            <Pressable style={[styles.next, saving && { opacity: 0.6 }]} disabled={saving} onPress={() => finish(true)}>
              <Text style={styles.nextT}>{saving ? '저장 중...' : '자정에 알림 받기'}</Text>
            </Pressable>
            <Pressable onPress={() => finish(false)}><Text style={styles.later}>알림 없이 볼게요</Text></Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Top onBack={() => (step === 1 ? router.back() : setStep(step - 1))} onSkip={skip} />
      <Prog step={step} />
      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 20 }}>
        {step === 1 && (
          <>
            <Text style={styles.h1}>매일 자정,{'\n'}<Text style={styles.em}>나만의 연애운</Text>을 받으려면</Text>
            <Text style={styles.sub}>생년월일로 오늘의 연애운을 계산해요.{'\n'}운세 외 용도로는 사용하지 않아요.</Text>
            <Text style={styles.lbl}>생년월일</Text>
            <View style={styles.selrow}>
              <PickerField placeholder="년" value={year ? `${year}년` : null} options={YEARS.map((y) => ({ label: `${y}년`, value: y }))} onSelect={(v) => setYear(v as number)} />
              <PickerField placeholder="월" value={month ? `${month}월` : null} options={MONTHS.map((m) => ({ label: `${m}월`, value: m }))} onSelect={(v) => setMonth(v as number)} />
              <PickerField placeholder="일" value={day ? `${day}일` : null} options={DAYS.map((d) => ({ label: `${d}일`, value: d }))} onSelect={(v) => setDay(v as number)} />
            </View>
            <Text style={styles.lbl}>태어난 시간 <Text style={styles.lblS}>· 더 정확한 운세를 위해 (선택)</Text></Text>
            <PickerField placeholder="태어난 시간" value={noTime ? null : timeIdx !== null ? SIJIN[timeIdx] : null}
              disabled={noTime} options={SIJIN.map((s, i) => ({ label: s, value: i }))} onSelect={(v) => setTimeIdx(v as number)} full />
            <Pressable style={styles.chk} onPress={() => setNoTime((v) => !v)}>
              <View style={[styles.chkBox, noTime && styles.chkBoxOn]}>{noTime && <Icon name="best" size={12} color="#fff" />}</View>
              <Text style={styles.chkT}>태어난 시간을 몰라요</Text>
            </Pressable>
          </>
        )}
        {step === 2 && (
          <>
            <Text style={styles.h1}>성별을 알려주세요</Text>
            <Text style={styles.sub}>궁합과 운세 해석에 활용돼요.</Text>
            <View style={styles.grid2}>
              {(['F', 'M'] as const).map((g) => (
                <Pressable key={g} style={[styles.optCol, gender === g && styles.optOn]} onPress={() => setGender(g)}>
                  <Text style={{ fontSize: 26 }}>{g === 'F' ? '🙋‍♀️' : '🙋‍♂️'}</Text>
                  <Text style={[styles.optB, gender === g && { color: colors.rose }]}>{g === 'F' ? '여성' : '남성'}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        {step === 3 && (
          <>
            <Text style={styles.h1}>지금 어떤 연애 중이에요?</Text>
            <Text style={styles.sub}>상태에 맞는 운세 항목을 보여드려요.{'\n'}바뀌면 언제든 수정하면 돼요.</Text>
            <View style={{ gap: 10, marginTop: 24 }}>
              {STATUSES.map((s) => (
                <Pressable key={s.key} style={[styles.optRow, status === s.key && styles.optOn]} onPress={() => setStatus(s.key)}>
                  <Text style={{ fontSize: 26 }}>{s.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optB, status === s.key && { color: colors.rose }]}>{s.label}</Text>
                    <Text style={styles.optDesc}>{s.desc}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <View style={styles.foot}>
        <Pressable
          style={[styles.next, ((step === 1 && !step1ok) || (step === 2 && !gender) || (step === 3 && !status)) && styles.nextOff]}
          disabled={(step === 1 && !step1ok) || (step === 2 && !gender) || (step === 3 && !status)}
          onPress={() => setStep(step + 1)}>
          <Text style={styles.nextT}>{step === 3 ? '내 연애운 보러 가기' : '다음'}</Text>
        </Pressable>
        {step === 1 && <Text style={styles.note}>입력한 정보는 마이페이지에서 언제든 수정할 수 있어요</Text>}
      </View>
    </SafeAreaView>
  );
}

function Top({ onBack, onSkip, dark }: { onBack: () => void; onSkip: () => void; dark?: boolean }) {
  return (
    <View style={styles.top}>
      <Pressable onPress={onBack} hitSlop={8}><Icon name="back" size={24} color={dark ? '#fff' : colors.sub} /></Pressable>
      <Pressable onPress={onSkip}><Text style={[styles.skip, dark && { color: 'rgba(255,255,255,0.6)' }]}>나중에 하기</Text></Pressable>
    </View>
  );
}

function Prog({ step }: { step: number }) {
  return (
    <View style={styles.prog}>
      {[1, 2, 3].map((i) => <View key={i} style={[styles.progI, step >= i && styles.progOn]} />)}
    </View>
  );
}

function PickerField({ placeholder, value, options, onSelect, disabled, full }: {
  placeholder: string; value: string | null; options: { label: string; value: number }[];
  onSelect: (v: number) => void; disabled?: boolean; full?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable style={[styles.select, full && { flex: undefined }, disabled && { opacity: 0.4 }]} disabled={disabled} onPress={() => setOpen(true)}>
        <Text style={[styles.selectT, !value && { color: colors.sub2 }]} numberOfLines={1}>{value ?? placeholder}</Text>
        <Icon name="chevronRight" size={14} color={colors.sub2} strokeWidth={2.5} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickBg} onPress={() => setOpen(false)}>
          <Pressable style={styles.pickSheet} onPress={(e) => e.stopPropagation()}>
            <ScrollView>
              {options.map((o) => (
                <Pressable key={o.value} style={styles.pickItem} onPress={() => { onSelect(o.value); setOpen(false); }}>
                  <Text style={styles.pickItemT}>{o.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8 },
  skip: { fontSize: 13, color: colors.sub2, fontWeight: weight.semibold as '600' },
  prog: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingTop: 14 },
  progI: { height: 4, flex: 1, borderRadius: 2, backgroundColor: colors.line },
  progOn: { backgroundColor: colors.rose },
  body: { flex: 1, paddingHorizontal: 22, paddingTop: 26 },
  h1: { fontSize: 22, fontWeight: weight.extrabold as '800', color: colors.ink, lineHeight: 30, letterSpacing: -0.4 },
  em: { color: colors.rose },
  sub: { fontSize: 13.5, color: colors.sub, marginTop: 8, lineHeight: 21 },
  lbl: { fontSize: 12.5, fontWeight: weight.bold as '700', color: colors.sub, marginTop: 26, marginBottom: 8 },
  lblS: { fontWeight: weight.regular as '400', color: colors.sub2 },
  selrow: { flexDirection: 'row', gap: 8 },
  select: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 12, height: 50, backgroundColor: colors.soft },
  selectT: { fontSize: 15, fontWeight: weight.semibold as '600', color: colors.ink, flex: 1 },
  chk: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  chkBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  chkBoxOn: { backgroundColor: colors.rose, borderColor: colors.rose },
  chkT: { fontSize: 13.5, fontWeight: weight.semibold as '600', color: colors.sub },
  grid2: { flexDirection: 'row', gap: 10, marginTop: 24 },
  optCol: { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: 16, paddingVertical: 22, alignItems: 'center', gap: 8, backgroundColor: colors.soft },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1.5, borderColor: colors.line, borderRadius: 16, padding: 17, backgroundColor: colors.soft },
  optOn: { borderColor: colors.rose, backgroundColor: colors.roseBg },
  optB: { fontSize: 15, fontWeight: weight.bold as '700', color: colors.ink },
  optDesc: { fontSize: 12, color: colors.sub2, marginTop: 2 },
  foot: { paddingHorizontal: 22, paddingVertical: 16 },
  next: { paddingVertical: 16, borderRadius: 16, backgroundColor: colors.rose, alignItems: 'center' },
  nextOff: { backgroundColor: colors.line },
  nextT: { color: '#fff', fontSize: 16, fontWeight: weight.extrabold as '800' },
  note: { textAlign: 'center', fontSize: 11, color: colors.sub2, marginTop: 10 },
  pickBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickSheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: 360, paddingVertical: 8 },
  pickItem: { paddingVertical: 14, paddingHorizontal: 24 },
  pickItemT: { fontSize: 15.5, color: colors.ink, fontWeight: weight.semibold as '600' },
  // 푸시 다크 화면
  pushBody: { flex: 1, alignItems: 'center', paddingHorizontal: 22, paddingTop: 60 },
  moon: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  pushH: { fontSize: 22, fontWeight: weight.extrabold as '800', color: '#fff', textAlign: 'center', lineHeight: 30 },
  pushSub: { fontSize: 13.5, color: 'rgba(255,255,255,0.72)', textAlign: 'center', marginTop: 8, lineHeight: 21 },
  times: { flexDirection: 'row', gap: 8, marginTop: 30 },
  time: { flex: 1, paddingVertical: 13, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center' },
  timeOn: { backgroundColor: colors.rose, borderColor: colors.rose },
  timeT: { fontSize: 13.5, fontWeight: weight.bold as '700', color: 'rgba(255,255,255,0.75)' },
  timeS: { fontSize: 10, fontWeight: weight.semibold as '600', color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  later: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: weight.semibold as '600', textAlign: 'center', marginTop: 12 },
});

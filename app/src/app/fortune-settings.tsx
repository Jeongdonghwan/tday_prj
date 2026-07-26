/** 마이 > 오늘연애 운세 설정 (FORTUNE_UPDATE.md §5 마이). 프로필 수정 + 푸시 on/off·시간 + 히스토리 30일. */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getFortuneHistory,
  getFortuneProfile,
  saveFortuneProfile,
  type FortuneHistoryItem,
  type LoveStatus,
  type PushTime,
} from '@/api/fortune';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { useFortune } from '@/fortune/FortuneContext';
import { notify } from '@/lib/dialogs';
import { registerForPush } from '@/push/registerPush';
import { colors, radius, weight } from '@/theme';

const STATUSES: { key: LoveStatus; label: string }[] = [
  { key: 'solo', label: '솔로' },
  { key: 'some', label: '썸 중' },
  { key: 'couple', label: '연애 중' },
  { key: 'rebound', label: '재회희망' },
];
const PUSH_TIMES: { key: PushTime; label: string }[] = [
  { key: '00', label: '자정 00시' },
  { key: '07', label: '아침 7시' },
  { key: '09', label: '아침 9시' },
];

function fmtBirth(iso: string) {
  return iso.replace(/-/g, '.');
}

export default function FortuneSettingsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { reload } = useFortune();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [birth, setBirth] = useState('');
  const [birthTime, setBirthTime] = useState<number | null>(null);
  const [gender, setGender] = useState<'F' | 'M'>('F');
  const [status, setStatus] = useState<LoveStatus>('solo');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushTime, setPushTime] = useState<PushTime>('00');
  const [history, setHistory] = useState<FortuneHistoryItem[]>([]);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [p, h] = await Promise.all([getFortuneProfile(token), getFortuneHistory(30, token)]);
      if (p.registered) {
        setBirth(fmtBirth(p.birth_date));
        setBirthTime(p.birth_time);
        setGender(p.gender);
        setStatus(p.love_status);
        setPushEnabled(p.push_enabled);
        setPushTime(p.push_time);
      }
      setHistory(h.items);
    } catch {
      /* 무시 */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function onTogglePush(next: boolean) {
    // 켤 때만 OS 권한 요청(온보딩과 동일 흐름). 끄면 즉시 반영.
    if (next && token) {
      try {
        await registerForPush(token);
      } catch {
        /* 권한 거부해도 상태는 반영, 저장 시 서버 기록 */
      }
    }
    setPushEnabled(next);
  }

  async function onSave() {
    if (!token) return;
    const iso = birth.replace(/[.\s]/g, '-').replace(/-+/g, '-');
    if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(iso)) {
      notify('운세 설정', '생년월일을 예: 1998.03.14 형식으로 입력해주세요.');
      return;
    }
    const [y, m, d] = iso.split('-');
    const norm = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    setSaving(true);
    try {
      await saveFortuneProfile(
        { birth_date: norm, birth_time: birthTime, gender, love_status: status, push_enabled: pushEnabled, push_time: pushTime },
        token,
      );
      await reload();
      notify('운세 설정', '저장했어요.');
      router.back();
    } catch {
      notify('운세 설정', '저장하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar title="운세 설정" onBack={() => router.back()} />
      {loading ? (
        <ActivityIndicator color={colors.rose} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* 프로필 */}
          <Text style={styles.h}>내 정보</Text>
          <Text style={styles.label}>생년월일</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 1998.03.14"
            placeholderTextColor={colors.sub2}
            value={birth}
            onChangeText={setBirth}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.label}>성별</Text>
          <View style={styles.seg}>
            {(['F', 'M'] as const).map((g) => (
              <Pressable key={g} style={[styles.segItem, gender === g && styles.segOn]} onPress={() => setGender(g)}>
                <Text style={[styles.segT, gender === g && styles.segTOn]}>{g === 'F' ? '여성' : '남성'}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>연애 상태</Text>
          <View style={styles.seg}>
            {STATUSES.map((s) => (
              <Pressable key={s.key} style={[styles.segItem, status === s.key && styles.segOn]} onPress={() => setStatus(s.key)}>
                <Text style={[styles.segT, status === s.key && styles.segTOn]}>{s.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* 푸시 */}
          <Text style={[styles.h, { marginTop: 26 }]}>운세 알림</Text>
          <View style={styles.pushRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pushB}>자정 연애운 알림</Text>
              <Text style={styles.pushS}>동의한 시간에 오늘의 연애운을 보내드려요</Text>
            </View>
            <Switch value={pushEnabled} onValueChange={onTogglePush} trackColor={{ true: colors.rose }} />
          </View>
          {pushEnabled && (
            <View style={styles.seg}>
              {PUSH_TIMES.map((t) => (
                <Pressable key={t.key} style={[styles.segItem, pushTime === t.key && styles.segOn]} onPress={() => setPushTime(t.key)}>
                  <Text style={[styles.segT, pushTime === t.key && styles.segTOn]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable style={[styles.save, saving && { opacity: 0.6 }]} disabled={saving} onPress={onSave}>
            <Text style={styles.saveT}>{saving ? '저장 중...' : '저장하기'}</Text>
          </Pressable>

          {/* 히스토리 */}
          <Text style={[styles.h, { marginTop: 30 }]}>최근 운세 (30일)</Text>
          {history.length === 0 ? (
            <Text style={styles.empty}>아직 열람한 운세가 없어요.</Text>
          ) : (
            history.map((it, i) => (
              <Pressable key={it.date} style={styles.hist} onPress={() => setOpenIdx(openIdx === i ? null : i)}>
                <View style={styles.histTop}>
                  <Text style={styles.histDate}>{it.date.replace(/-/g, '.')}</Text>
                  <Text style={styles.histScore}>{it.score}점</Text>
                </View>
                <Text style={styles.histSum} numberOfLines={openIdx === i ? undefined : 1}>
                  {openIdx === i ? it.full_text : it.summary}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  h: { fontSize: 16, fontWeight: weight.extrabold as '800', color: colors.ink, marginBottom: 10 },
  label: { fontSize: 12.5, fontWeight: weight.bold as '700', color: colors.sub, marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 14.5, color: colors.ink, backgroundColor: colors.soft },
  seg: { flexDirection: 'row', gap: 8 },
  segItem: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft },
  segOn: { borderColor: colors.rose, backgroundColor: colors.roseBg },
  segT: { fontSize: 13, fontWeight: weight.semibold as '600', color: colors.sub },
  segTOn: { color: colors.rose, fontWeight: weight.bold as '700' },
  pushRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  pushB: { fontSize: 14, fontWeight: weight.bold as '700', color: colors.ink },
  pushS: { fontSize: 12, color: colors.sub2, marginTop: 3 },
  save: { marginTop: 24, backgroundColor: colors.rose, borderRadius: radius.input, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveT: { color: '#fff', fontSize: 15, fontWeight: weight.bold as '700' },
  empty: { fontSize: 13, color: colors.sub2, paddingVertical: 12 },
  hist: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, marginBottom: 8, backgroundColor: colors.soft },
  histTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  histDate: { fontSize: 13, fontWeight: weight.bold as '700', color: colors.ink },
  histScore: { fontSize: 13, fontWeight: weight.extrabold as '800', color: colors.rose },
  histSum: { fontSize: 12.5, color: colors.sub, marginTop: 5, lineHeight: 18 },
});

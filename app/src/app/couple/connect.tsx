/** 커플 연결 (스펙 §5-7). API 연동: 초대코드 생성/입력 + 시작일. */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { createInvite, getDday, joinCouple, setStartDate, type Dday } from '@/api/couple';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { colors, radius, weight } from '@/theme';

export default function CoupleConnect() {
  const router = useRouter();
  const { token, refresh } = useAuth();
  const [dday, setDday] = useState<Dday | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await getDday(token);
      setDday(d);
      setDateInput(d.start_date ?? '');
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onGenerate() {
    if (!token) return;
    setBusy(true);
    try {
      const r = await createInvite(token);
      setCode(r.invite_code);
      await refresh();
    } catch {
      Alert.alert('커플 연결', '코드 생성에 실패했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function onJoin() {
    if (!token || joinInput.trim().length !== 6) {
      Alert.alert('커플 연결', '6자리 코드를 입력해주세요.');
      return;
    }
    setBusy(true);
    try {
      await joinCouple(joinInput.trim().toUpperCase(), token);
      await refresh();
      await load();
      Alert.alert('커플 연결', '연결됐어요!');
    } catch (e) {
      Alert.alert('커플 연결', e instanceof ApiError ? e.message : '연결에 실패했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function onSetDate() {
    if (!token || !/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      Alert.alert('시작일', 'YYYY-MM-DD 형식으로 입력해주세요.');
      return;
    }
    setBusy(true);
    try {
      await setStartDate(dateInput, token);
      await load();
    } catch {
      Alert.alert('시작일', '저장에 실패했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="back" size={24} color={colors.ink} strokeWidth={1.9} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.rose} style={{ marginTop: 60 }} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
<ScrollView contentContainerStyle={styles.wrap}>
          <View style={styles.illust}>
            <Icon name="heart" size={42} color={colors.rose} strokeWidth={1.7} />
          </View>

          {dday?.connected ? (
            <>
              <Text style={styles.h}>{dday.partner ?? '상대'}님과 연결됐어요</Text>
              {dday.days != null && <Text style={styles.bigDay}>{dday.days}일째</Text>}
              {dday.next && (
                <Text style={styles.p}>
                  다음 기념일 · {dday.next.label} D-{dday.next.d_day}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.h}>상대를 초대해{'\n'}둘만의 공간을 열어요</Text>
              <Text style={styles.p}>상대가 코드를 입력하면 오늘의 질문 답과{'\n'}일정을 함께 볼 수 있어요.</Text>

              <View style={styles.code}>
                <Text style={styles.codeLabel}>내 초대 코드</Text>
                <Text style={styles.codeText}>{code ? code.split('').join(' ') : '— — — — — —'}</Text>
              </View>
              <Pressable style={[styles.primary, busy && styles.dim]} disabled={busy} onPress={onGenerate}>
                <Text style={styles.primaryText}>{code ? '코드 다시 만들기' : '초대 코드 만들기'}</Text>
              </Pressable>

              <View style={styles.or}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>또는 받은 코드 입력</Text>
                <View style={styles.orLine} />
              </View>
              <View style={styles.joinRow}>
                <TextInput
                  style={styles.joinInput}
                  placeholder="6자리 코드"
                  placeholderTextColor={colors.sub2}
                  autoCapitalize="characters"
                  maxLength={6}
                  value={joinInput}
                  onChangeText={setJoinInput}
                />
                <Pressable style={[styles.joinBtn, busy && styles.dim]} disabled={busy} onPress={onJoin}>
                  <Text style={styles.joinBtnText}>연결</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* 시작일 (연결 여부와 무관하게 설정 가능) */}
          <View style={styles.startdate}>
            <Text style={styles.sdLabel}>우리 시작한 날</Text>
            <View style={styles.sdRow}>
              <TextInput
                style={styles.sdInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.sub2}
                value={dateInput}
                onChangeText={setDateInput}
                maxLength={10}
              />
              <Pressable style={[styles.sdBtn, busy && styles.dim]} disabled={busy} onPress={onSetDate}>
                <Text style={styles.sdBtnText}>저장</Text>
              </Pressable>
            </View>
            <Text style={styles.foot}>설정하면 327일째처럼 자동으로 세어드려요. 둘 중 누가 정해도 함께 적용돼요.</Text>
          </View>
        </ScrollView>
</KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  bar: { paddingHorizontal: 16, paddingVertical: 8 },
  wrap: { paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center' },
  illust: { width: 88, height: 88, borderRadius: 28, backgroundColor: colors.roseBg, alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 22 },
  h: { fontSize: 21, fontWeight: weight.extrabold as '800', color: colors.ink, textAlign: 'center', lineHeight: 30, letterSpacing: -0.4 },
  bigDay: { fontSize: 34, fontWeight: weight.extrabold as '800', color: colors.rose, marginTop: 10, letterSpacing: -1 },
  p: { fontSize: 14, color: colors.sub, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  code: { alignSelf: 'stretch', marginTop: 26, marginBottom: 8, backgroundColor: colors.soft, borderRadius: radius.card, padding: 20, alignItems: 'center' },
  codeLabel: { fontSize: 12, color: colors.sub, fontWeight: weight.semibold as '600' },
  codeText: { fontSize: 30, fontWeight: weight.extrabold as '800', letterSpacing: 3, marginTop: 8, color: colors.ink },
  primary: { alignSelf: 'stretch', backgroundColor: colors.rose, borderRadius: radius.input, paddingVertical: 15, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#fff', fontWeight: weight.extrabold as '800', fontSize: 15 },
  dim: { opacity: 0.55 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22, alignSelf: 'stretch' },
  orLine: { flex: 1, height: 1, backgroundColor: colors.line },
  orText: { color: colors.sub2, fontSize: 12, fontWeight: weight.semibold as '600' },
  joinRow: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  joinInput: { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.button, paddingHorizontal: 14, height: 48, fontSize: 16, fontWeight: weight.bold as '700', letterSpacing: 2, color: colors.ink },
  joinBtn: { paddingHorizontal: 22, height: 48, borderRadius: radius.button, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  joinBtnText: { color: '#fff', fontWeight: weight.bold as '700', fontSize: 14 },
  startdate: { alignSelf: 'stretch', marginTop: 26, borderWidth: 1.5, borderColor: colors.rose, borderRadius: radius.card, padding: 18 },
  sdLabel: { fontSize: 12, color: colors.rose, fontWeight: weight.bold as '700' },
  sdRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  sdInput: { flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.button, paddingHorizontal: 12, height: 44, fontSize: 15, color: colors.ink },
  sdBtn: { paddingHorizontal: 18, height: 44, borderRadius: radius.button, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' },
  sdBtnText: { color: '#fff', fontWeight: weight.bold as '700', fontSize: 14 },
  foot: { fontSize: 12, color: colors.sub, marginTop: 12, lineHeight: 18 },
});

/**
 * 소셜 로그인 화면 (스펙 §1, §10: 카카오 + 애플 필수).
 * 카카오/애플 네이티브 SDK 는 후속 단계 — 지금은 안내 + 개발용 로그인으로 인증 경로 E2E.
 */
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { colors, fontSize, radius, spacing, weight } from '@/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [devId, setDevId] = useState('tester1');

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : '로그인에 실패했어요. 잠시 후 다시 시도해주세요.';
      Alert.alert('로그인', msg);
    } finally {
      setBusy(null);
    }
  }

  const onKakao = () =>
    run('kakao', async () => {
      // TODO: @react-native-seoul/kakao-login 으로 access token 획득 후 전달 (후속)
      await signIn({ provider: 'kakao', token: 'PLACEHOLDER' });
    });

  const onApple = () =>
    run('apple', async () => {
      // TODO: expo-apple-authentication 으로 identityToken 획득 후 전달 (후속)
      await signIn({ provider: 'apple', token: 'PLACEHOLDER' });
    });

  const onDev = () => run('dev', () => signIn({ provider: 'dev', social_id: devId.trim() || 'tester1' }));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <View style={styles.hero}>
          <Text style={styles.brand}>썰전</Text>
          <Text style={styles.tagline}>오늘의 연애, 어느 편이세요?</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.btn, styles.kakao, busy && styles.btnDim]}
            disabled={!!busy}
            onPress={onKakao}>
            <Text style={[styles.btnText, { color: '#3A1D1D' }]}>카카오로 시작하기</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, styles.apple, busy && styles.btnDim]}
            disabled={!!busy}
            onPress={onApple}>
            <Text style={[styles.btnText, { color: '#fff' }]}>Apple로 시작하기</Text>
          </Pressable>

          <Text style={styles.policy}>
            가입 시 이용약관과 개인정보처리방침에 동의하게 됩니다.
          </Text>
        </View>

        {/* 개발용 로그인 (DEV_LOGIN_ENABLED) — 키 없이 인증 경로 테스트 */}
        <View style={styles.devBox}>
          <View style={styles.devHead}>
            <Icon name="info" size={14} color={colors.sub} strokeWidth={2} />
            <Text style={styles.devLabel}>개발용 로그인</Text>
          </View>
          <View style={styles.devRow}>
            <TextInput
              value={devId}
              onChangeText={setDevId}
              placeholder="dev social_id"
              placeholderTextColor={colors.sub2}
              autoCapitalize="none"
              style={styles.devInput}
            />
            <Pressable style={[styles.devBtn, busy && styles.btnDim]} disabled={!!busy} onPress={onDev}>
              <Text style={styles.devBtnText}>{busy === 'dev' ? '...' : '로그인'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between', paddingBottom: spacing.xxl },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  brand: { fontSize: 40, fontWeight: weight.extrabold as '800', letterSpacing: -1, color: colors.ink },
  tagline: { fontSize: fontSize.body, color: colors.sub, fontWeight: weight.semibold as '600' },
  actions: { gap: 10 },
  btn: { height: 52, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center' },
  btnDim: { opacity: 0.6 },
  btnText: { fontSize: 15.5, fontWeight: weight.bold as '700' },
  kakao: { backgroundColor: '#FAE100' },
  apple: { backgroundColor: '#111111' },
  policy: { textAlign: 'center', fontSize: 11.5, color: colors.sub2, marginTop: 8, lineHeight: 17 },
  devBox: { marginTop: 24, padding: 14, borderRadius: radius.card, backgroundColor: colors.soft },
  devHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  devLabel: { fontSize: 12, fontWeight: weight.bold as '700', color: colors.sub },
  devRow: { flexDirection: 'row', gap: 8 },
  devInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.button,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  devBtn: {
    paddingHorizontal: 18,
    height: 44,
    borderRadius: radius.button,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devBtnText: { color: '#fff', fontWeight: weight.bold as '700', fontSize: 14 },
});

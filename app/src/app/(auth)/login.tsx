/**
 * 소셜 로그인 화면 (스펙 §1, §10: 카카오 + 애플 필수).
 * 카카오/애플 네이티브 SDK 는 후속 단계 — 지금은 안내 + 개발용 로그인으로 인증 경로 E2E.
 */
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as WebBrowser from 'expo-web-browser';

import { ApiError } from '@/api/client';
import { WEB_BASE_URL } from '@/api/tests';
import { KakaoCancelled, loginWithKakao, startKakaoWebLogin } from '@/auth/kakao';
import { useAuth } from '@/auth/AuthContext';
import { notify } from '@/lib/dialogs';
import { BrandLogo } from '@/components/BrandLogo';
import { colors, fontSize, radius, spacing, weight } from '@/theme';

export default function LoginScreen() {
  const { signIn, emailAuth } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : '로그인에 실패했어요. 잠시 후 다시 시도해주세요.';
      notify('로그인', msg);
    } finally {
      setBusy(null);
    }
  }

  const onEmail = () => {
    if (!email.trim() || !password) {
      notify('이메일 로그인', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    run('email', () => emailAuth(emailMode, email.trim(), password));
  };

  const onKakao = () => {
    // 웹: 서버 OAuth 리다이렉트로 이동(콜백이 #token 반환)
    if (Platform.OS === 'web') {
      startKakaoWebLogin();
      return;
    }
    // 네이티브: SDK 로그인 → accessToken → 서버
    run('kakao', async () => {
      try {
        const accessToken = await loginWithKakao();
        await signIn({ provider: 'kakao', token: accessToken });
      } catch (e) {
        if (e instanceof KakaoCancelled) return; // 사용자 취소는 조용히
        // 원인 노출 (키해시 미등록, SDK 미포함 등) — 출시 전 디버깅용
        const raw = e instanceof Error ? e.message : String(e);
        notify('카카오 로그인 실패', raw || '알 수 없는 오류가 발생했어요.');
      }
    });
  };

  const onApple = () => {
    // iOS 전용 — identityToken(JWT)을 서버(_resolve_apple JWKS 검증)로 전달
    run('apple', async () => {
      try {
        const AppleAuthentication = await import('expo-apple-authentication');
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        if (!credential.identityToken) throw new Error('no identity token');
        await signIn({ provider: 'apple', token: credential.identityToken });
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code === 'ERR_REQUEST_CANCELED') return; // 사용자 취소는 조용히
        if (e instanceof ApiError) throw e; // 서버 오류는 공통 핸들러(run)로
        // 네이티브 모듈 부재(구 빌드/Expo Go) 등
        notify('Apple 로그인', 'Apple 로그인은 최신 iOS 빌드에서 이용할 수 있어요.');
      }
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <View style={styles.hero}>
          <BrandLogo height={40} />
          <Text style={styles.tagline}>오늘의 연애, 어느 편이세요?</Text>
        </View>

        <View style={styles.actions}>
          {/* 카카오: iOS 네이티브 SDK 이슈로 v1에서는 iOS 미노출 (안드로이드·웹은 정상). v1.1에서 복구 예정 */}
          {Platform.OS !== 'ios' && (
            <Pressable
              style={[styles.btn, styles.kakao, busy && styles.btnDim]}
              disabled={!!busy}
              onPress={onKakao}>
              <Text style={[styles.btnText, { color: '#3A1D1D' }]}>카카오로 시작하기</Text>
            </Pressable>
          )}

          {/* Apple 로그인은 iOS 전용 (expo-apple-authentication) — 안드로이드/웹에선 미노출 */}
          {Platform.OS === 'ios' && (
            <Pressable
              style={[styles.btn, styles.apple, busy && styles.btnDim]}
              disabled={!!busy}
              onPress={onApple}>
              <Text style={[styles.btnText, { color: '#fff' }]}>Apple로 시작하기</Text>
            </Pressable>
          )}

          {/* 이메일 간편가입/로그인 — 접이식 */}
          {!emailOpen ? (
            <Pressable style={styles.emailToggle} onPress={() => setEmailOpen(true)} hitSlop={6}>
              <Text style={styles.emailToggleText}>이메일로 시작하기</Text>
            </Pressable>
          ) : (
            <View style={styles.emailBox}>
              <View style={styles.emailTabs}>
                {(['login', 'signup'] as const).map((m) => (
                  <Pressable key={m} style={[styles.emailTab, emailMode === m && styles.emailTabOn]} onPress={() => setEmailMode(m)}>
                    <Text style={[styles.emailTabText, emailMode === m && styles.emailTabTextOn]}>
                      {m === 'login' ? '로그인' : '간편가입'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="이메일"
                placeholderTextColor={colors.sub2}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                style={styles.emailInput}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={emailMode === 'signup' ? '비밀번호 (8자 이상)' : '비밀번호'}
                placeholderTextColor={colors.sub2}
                secureTextEntry
                autoCapitalize="none"
                style={styles.emailInput}
              />
              <Pressable style={[styles.btn, styles.emailBtn, busy && styles.btnDim]} disabled={!!busy} onPress={onEmail}>
                <Text style={[styles.btnText, { color: '#fff' }]}>
                  {busy === 'email' ? '...' : emailMode === 'login' ? '이메일로 로그인' : '가입하기'}
                </Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.policy}>
            가입 시{' '}
            <Text style={styles.policyLink} onPress={() => WebBrowser.openBrowserAsync(`${WEB_BASE_URL}/terms`)}>
              이용약관
            </Text>
            과{' '}
            <Text style={styles.policyLink} onPress={() => WebBrowser.openBrowserAsync(`${WEB_BASE_URL}/privacy`)}>
              개인정보처리방침
            </Text>
            에 동의하게 됩니다.
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  // maxWidth: 데스크톱 웹에서 버튼이 화면 전체로 늘어지지 않게 카드 폭으로 제한
  body: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between', paddingBottom: spacing.xxl, width: '100%', maxWidth: 460, alignSelf: 'center' },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  tagline: { fontSize: fontSize.body, color: colors.sub, fontWeight: weight.semibold as '600' },
  actions: { gap: 10 },
  btn: { height: 52, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center' },
  btnDim: { opacity: 0.6 },
  btnText: { fontSize: 15.5, fontWeight: weight.bold as '700' },
  kakao: { backgroundColor: '#FAE100' },
  apple: { backgroundColor: '#111111' },
  emailToggle: { alignItems: 'center', paddingVertical: 10 },
  emailToggleText: { fontSize: 13, color: colors.sub, fontWeight: weight.semibold as '600', textDecorationLine: 'underline' },
  emailBox: { gap: 8, marginTop: 4 },
  emailTabs: { flexDirection: 'row', backgroundColor: colors.soft, borderRadius: 11, padding: 3 },
  emailTab: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 9 },
  emailTabOn: { backgroundColor: colors.bg },
  emailTabText: { fontSize: 12.5, fontWeight: weight.bold as '700', color: colors.sub },
  emailTabTextOn: { color: colors.ink },
  emailInput: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14.5,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  emailBtn: { backgroundColor: colors.rose },
  policy: { textAlign: 'center', fontSize: 11.5, color: colors.sub2, marginTop: 8, lineHeight: 17 },
  policyLink: { color: colors.sub, fontWeight: weight.bold as '700', textDecorationLine: 'underline' },
});

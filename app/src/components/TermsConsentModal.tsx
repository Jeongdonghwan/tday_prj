/** 개정 약관 소프트 재동의 모달 (글로벌 확장 Phase 2-5).
 *  로그인 유저가 v2 약관 미동의(terms_v2_agreed_at==null)면 1회 노출. 닫아도 앱 사용 무제약.
 *  '동의' → POST /me/terms-agree + refresh. '나중에' → 이번 세션 dismiss(다음 실행 시 재노출). */
import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { agreeTermsV2 } from '@/api/auth';
import { useAuth } from '@/auth/AuthContext';
import { WEB_BASE_URL } from '@/api/tests';
import { colors, radius, weight } from '@/theme';

export function TermsConsentModal() {
  const { t } = useTranslation();
  const { token, user, refresh } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  const show = !!token && !!user && user.terms_v2_agreed_at == null && !dismissed;

  async function onAgree() {
    if (!token) return;
    setBusy(true);
    try {
      await agreeTermsV2(token);
      await refresh();
    } catch {
      setDismissed(true); // 실패해도 막지 않음(비차단)
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={() => setDismissed(true)}>
      <View style={styles.bg}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('terms.title')}</Text>
          <Text style={styles.body}>{t('terms.body')}</Text>
          <Pressable onPress={() => Linking.openURL(`${WEB_BASE_URL}/terms`)}>
            <Text style={styles.view}>{t('terms.view')} ›</Text>
          </Pressable>
          <Pressable style={[styles.agree, busy && { opacity: 0.6 }]} disabled={busy} onPress={onAgree}>
            <Text style={styles.agreeT}>{t('terms.agree')}</Text>
          </Pressable>
          <Pressable style={styles.later} onPress={() => setDismissed(true)}>
            <Text style={styles.laterT}>{t('terms.later')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 },
  title: { fontSize: 17, fontWeight: weight.extrabold as '800', color: colors.ink },
  body: { fontSize: 13.5, color: colors.sub, lineHeight: 20, marginTop: 10 },
  view: { fontSize: 12.5, color: colors.rose, fontWeight: weight.bold as '700', marginTop: 12 },
  agree: { marginTop: 18, backgroundColor: colors.rose, borderRadius: radius.input, height: 50, alignItems: 'center', justifyContent: 'center' },
  agreeT: { color: '#fff', fontSize: 15, fontWeight: weight.bold as '700' },
  later: { marginTop: 6, height: 42, alignItems: 'center', justifyContent: 'center' },
  laterT: { color: colors.sub2, fontSize: 13.5, fontWeight: weight.semibold as '600' },
});

/** 테스트존 WebView 스크린 (DESIGN_UPDATE §6). 웹(Flask)의 /t 를 띄운다. */
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { WEB_BASE_URL } from '@/api/tests';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { notify } from '@/lib/dialogs';
import { shareUrl } from '@/lib/share';
import { colors, weight } from '@/theme';

export default function TestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  // app_uid 로 로그인 유저와 결과 뱃지 연동 (DECISIONS #13), ref=app 퍼널 표시
  const uid = user?.id ? `&app_uid=${user.id}` : '';
  const path = slug ? `/t/${slug}` : '/t';
  const uri = `${WEB_BASE_URL}${path}?ref=app${uid}`;
  const shareHref = `${WEB_BASE_URL}${path}?ref=share`; // 공유용 퍼블릭 링크

  // 결과 페이지(t_result.html)의 공유/복사 버튼 → 네이티브 공유 시트/클립보드 브리지
  async function onWebMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type?: string; url?: string; title?: string };
      if (msg.type === 'share' && msg.url) {
        await shareUrl(msg.url, msg.title || '나랑 연애 심리테스트 해볼래?');
      } else if (msg.type === 'copy' && msg.url) {
        try {
          // 네이티브 모듈 — 구 빌드(미포함)에서는 catch 로 공유 시트 폴백 (시트에 '복사' 있음)
          const Clipboard = await import('expo-clipboard');
          await Clipboard.setStringAsync(msg.url);
          notify('링크 복사', '링크를 복사했어요! 친구에게 붙여넣기 하세요.');
        } catch {
          await shareUrl(msg.url, msg.title || '');
        }
      }
    } catch {
      /* 웹페이지의 다른 메시지 무시 */
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="back" size={24} color={colors.ink} strokeWidth={1.9} />
        </Pressable>
        <Text style={styles.title}>연애 심리테스트</Text>
        <Pressable onPress={() => shareUrl(shareHref, '나랑 연애 심리테스트 해볼래? 결과 궁금해!')} hitSlop={8}>
          <Icon name="share" size={22} color={colors.ink} strokeWidth={1.9} />
        </Pressable>
      </View>
      <WebView source={{ uri }} style={{ flex: 1 }} onMessage={onWebMessage} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.line },
  title: { fontSize: 16, fontWeight: weight.extrabold as '800', color: colors.ink },
});

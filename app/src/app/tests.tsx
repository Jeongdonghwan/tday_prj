/** 테스트존 WebView 스크린 (DESIGN_UPDATE §6). 웹(Flask)의 /t 를 띄운다. */
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { WEB_BASE_URL } from '@/api/tests';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { colors, weight } from '@/theme';

export default function TestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // app_uid 로 로그인 유저와 결과 뱃지 연동 (DECISIONS #13), ref=app 퍼널 표시
  const uid = user?.id ? `&app_uid=${user.id}` : '';
  const uri = `${WEB_BASE_URL}/t?ref=app${uid}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="back" size={24} color={colors.ink} strokeWidth={1.9} />
        </Pressable>
        <Text style={styles.title}>테스트존</Text>
        <View style={{ width: 24 }} />
      </View>
      <WebView source={{ uri }} style={{ flex: 1 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.line },
  title: { fontSize: 16, fontWeight: weight.extrabold as '800', color: colors.ink },
});

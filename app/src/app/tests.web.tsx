/**
 * 테스트존 (웹 플랫폼 전용, Task 4-0): react-native-webview 는 웹 런타임이 없어
 * 데스크톱/웹에서는 <iframe> 으로 동일한 /t 를 임베드한다. tests.tsx(네이티브)와 병행.
 */
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WEB_BASE_URL } from '@/api/tests';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { colors, weight } from '@/theme';

export default function TestsScreenWeb() {
  const router = useRouter();
  const { user } = useAuth();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const uid = user?.id ? `&app_uid=${user.id}` : '';
  const uri = `${WEB_BASE_URL}${slug ? `/t/${slug}` : '/t'}?ref=app${uid}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="back" size={24} color={colors.ink} strokeWidth={1.9} />
        </Pressable>
        <Text style={styles.title}>테스트존</Text>
        <View style={{ width: 24 }} />
      </View>
      {/* iframe 은 웹 전용 DOM 요소 (react-native-web 렌더러가 통과시킴) */}
      <iframe src={uri} style={{ flex: 1, border: 'none', width: '100%', height: '100%' }} title="테스트존" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.line },
  title: { fontSize: 16, fontWeight: weight.extrabold as '800', color: colors.ink },
});

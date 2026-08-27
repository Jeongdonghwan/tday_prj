/** 프로필 수정 — 닉네임 + 기본 아바타 선택. */
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { updateMe } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { Avatar } from '@/components/Avatar';
import { useIsDesktop } from '@/hooks/useResponsive';
import { colors, weight } from '@/theme';

const AVATARS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function ProfileEditScreen() {
  const { user, token, refresh } = useAuth();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [avatarNo, setAvatarNo] = useState(user?.avatar_no ?? 1);
  const [busy, setBusy] = useState(false);

  const canSave = nickname.trim().length > 0 && !busy;

  async function onSave() {
    if (!canSave || !token) return;
    setBusy(true);
    try {
      await updateMe({ nickname: nickname.trim(), avatar_no: avatarNo }, token);
      await refresh();
      router.back();
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 409
          ? '이미 사용 중인 닉네임이에요.'
          : '저장에 실패했어요. 다시 시도해주세요.';
      Alert.alert('프로필', msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.col}>
        <AppBar
          title="프로필 수정"
          onBack={() => router.back()}
          right={
            <Pressable hitSlop={8} disabled={!canSave} onPress={onSave}>
              <Text style={[styles.save, canSave && styles.saveOn]}>{busy ? '저장 중' : '저장'}</Text>
            </Pressable>
          }
        />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
<ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.avatarHead}>
            <Avatar avatarNo={avatarNo} size={72} />
          </View>

          <Text style={styles.label}>닉네임</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="닉네임"
            placeholderTextColor={colors.sub2}
            maxLength={30}
          />

          <Text style={[styles.label, { marginTop: 22 }]}>아바타</Text>
          <View style={styles.grid}>
            {AVATARS.map((n) => (
              <Pressable key={n} onPress={() => setAvatarNo(n)} style={[styles.avatarCell, avatarNo === n && styles.avatarSel]}>
                <Avatar avatarNo={n} size={54} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
</KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  col: { flex: 1, width: '100%' },
  save: { fontSize: 14, fontWeight: weight.bold as '700', color: colors.sub2 },
  saveOn: { color: colors.rose },
  avatarHead: { alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: weight.bold as '700', color: colors.sub, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 15, color: colors.ink, backgroundColor: colors.bg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  avatarCell: { padding: 4, borderRadius: 999, borderWidth: 2, borderColor: 'transparent' },
  avatarSel: { borderColor: colors.rose },
});

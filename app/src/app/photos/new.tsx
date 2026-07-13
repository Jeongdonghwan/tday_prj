/** 사진 올리기 — 이미지 선택 + 제목 → 업로드 후 photo 게시판에 등록. */
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createPost } from '@/api/posts';
import { uploadImage } from '@/api/uploads';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { useIsDesktop } from '@/hooks/useResponsive';
import { colors, radius, weight } from '@/theme';

export default function NewPhotoScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [uri, setUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const canPost = !!uri && title.trim().length > 0 && !busy;

  async function pick() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) setUri(res.assets[0].uri);
  }

  async function onSubmit() {
    if (!canPost || !token || !uri) return;
    setBusy(true);
    try {
      const image_url = await uploadImage(uri, token);
      await createPost({ category: 'photo', title: title.trim(), image_url }, token);
      router.back();
    } catch {
      Alert.alert('사진', '업로드에 실패했어요. 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, isDesktop && styles.safeDesktop]}>
      <View style={[styles.col, isDesktop && styles.colDesktop]}>
        <View style={styles.bar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.cancel}>취소</Text>
          </Pressable>
          <Text style={styles.barTitle}>사진 올리기</Text>
          <Pressable hitSlop={8} disabled={!canPost} onPress={onSubmit}>
            <Text style={[styles.post, canPost && styles.postActive]}>{busy ? '올리는 중' : '등록'}</Text>
          </Pressable>
        </View>

        <Pressable style={styles.picker} onPress={pick}>
          {uri ? (
            <Image source={{ uri }} style={styles.preview} contentFit="cover" />
          ) : (
            <View style={styles.pickEmpty}>
              <Icon name="plus" size={28} color={colors.sub} strokeWidth={2} />
              <Text style={styles.pickText}>사진 선택</Text>
            </View>
          )}
        </Pressable>

        <TextInput
          style={styles.titleInput}
          placeholder="제목을 입력하세요"
          placeholderTextColor={colors.sub2}
          value={title}
          onChangeText={setTitle}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  safeDesktop: { alignItems: 'center' },
  col: { flex: 1, width: '100%' },
  colDesktop: { maxWidth: 680, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.line },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  cancel: { fontSize: 14, color: colors.sub, fontWeight: weight.semibold as '600' },
  barTitle: { fontSize: 15, fontWeight: weight.extrabold as '800', color: colors.ink },
  post: { fontSize: 14, fontWeight: weight.bold as '700', color: colors.sub2 },
  postActive: { color: colors.rose },
  picker: { margin: 18 },
  preview: { width: '100%', aspectRatio: 1, borderRadius: radius.card, backgroundColor: colors.soft },
  pickEmpty: { width: '100%', aspectRatio: 1, borderRadius: radius.card, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', gap: 8 },
  pickText: { fontSize: 13, color: colors.sub, fontWeight: weight.semibold as '600' },
  titleInput: { fontSize: 16, fontWeight: weight.bold as '700', paddingHorizontal: 18, paddingVertical: 12, color: colors.ink },
});

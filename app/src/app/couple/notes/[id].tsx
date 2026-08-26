/** 속마음이야기 상세 — 양식 3섹션 + 답글. 작성자만 수정/삭제. */
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addCoupleNoteComment, deleteCoupleNote, getCoupleNote, NOTE_SECTIONS, type CoupleNote } from '@/api/coupleNotes';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { confirmAsync, notify } from '@/lib/dialogs';
import { colors, radius, weight } from '@/theme';

export default function CoupleNoteDetailScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const noteId = Number(id);
  const [note, setNote] = useState<CoupleNote | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !noteId) return;
    try {
      setNote(await getCoupleNote(noteId, token));
    } catch {
      notify('속마음이야기', '불러오지 못했어요.');
      router.back();
    }
  }, [token, noteId, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onDelete() {
    if (!token || !(await confirmAsync('삭제', '이 이야기를 삭제할까요?', '삭제'))) return;
    try {
      await deleteCoupleNote(noteId, token);
      router.back();
    } catch {
      notify('속마음이야기', '삭제하지 못했어요.');
    }
  }

  async function onComment() {
    if (!token || !comment.trim()) return;
    setBusy(true);
    try {
      await addCoupleNoteComment(noteId, comment.trim(), token);
      setComment('');
      await load();
    } catch {
      notify('속마음이야기', '답글을 남기지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar
        title="속마음이야기"
        onBack={() => router.back()}
        right={
          note?.is_mine ? (
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <Pressable onPress={() => router.push({ pathname: '/couple/notes/new', params: { id: noteId } })} hitSlop={8}>
                <Text style={styles.act}>수정</Text>
              </Pressable>
              <Pressable onPress={onDelete} hitSlop={8}>
                <Text style={[styles.act, { color: colors.rose }]}>삭제</Text>
              </Pressable>
            </View>
          ) : undefined
        }
      />
      {!note ? (
        <ActivityIndicator color={colors.rose} style={{ marginTop: 60 }} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            <View style={styles.authorRow}>
              <Avatar avatarNo={note.author.avatar_no} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={styles.who}>{note.is_mine ? '나' : note.author.nickname}</Text>
                <Text style={styles.date}>{(note.note_date ?? note.created_at.slice(0, 10)).replace(/-/g, '.')} · {note.time_ago}</Text>
              </View>
            </View>
            <Text style={styles.title}>{note.title}</Text>

            {NOTE_SECTIONS.map((s) =>
              note[s.key] ? (
                <View key={s.key} style={styles.sec}>
                  <Text style={styles.secH}>{s.emoji} {s.label}</Text>
                  <Text style={styles.secP}>{note[s.key]}</Text>
                </View>
              ) : null,
            )}

            <Text style={styles.cmtH}>답글 {note.comment_count}</Text>
            {(note.comments ?? []).map((c) => (
              <View key={c.id} style={styles.cmt}>
                <Avatar avatarNo={c.author.avatar_no} size={26} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cmtWho}>{c.is_mine ? '나' : c.author.nickname} <Text style={styles.date}>· {c.time_ago}</Text></Text>
                  <Text style={styles.cmtBody}>{c.body}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder={note.is_mine ? '덧붙이고 싶은 말' : '상대에게 답글 남기기'}
              placeholderTextColor={colors.sub2}
              value={comment}
              onChangeText={setComment}
              maxLength={500}
            />
            <Pressable style={[styles.send, (!comment.trim() || busy) && { opacity: 0.4 }]} disabled={!comment.trim() || busy} onPress={onComment}>
              <Icon name="chevronRight" size={20} color="#fff" strokeWidth={2} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  act: { fontSize: 14, fontWeight: weight.bold as '700', color: colors.ink },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  who: { fontSize: 13.5, fontWeight: weight.bold as '700', color: colors.ink },
  date: { fontSize: 11.5, color: colors.sub2, fontWeight: weight.semibold as '600' },
  title: { fontSize: 20, fontWeight: weight.extrabold as '800', color: colors.ink, marginTop: 14, lineHeight: 28 },
  sec: { marginTop: 16, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.line, borderRadius: radius.cardLg, padding: 14 },
  secH: { fontSize: 13.5, fontWeight: weight.extrabold as '800', color: colors.ink },
  secP: { fontSize: 14.5, color: colors.ink, lineHeight: 22, marginTop: 6 },
  cmtH: { fontSize: 14, fontWeight: weight.extrabold as '800', color: colors.ink, marginTop: 26, marginBottom: 6 },
  cmt: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  cmtWho: { fontSize: 12.5, fontWeight: weight.bold as '700', color: colors.ink },
  cmtBody: { fontSize: 14, color: colors.ink, lineHeight: 20, marginTop: 3 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg },
  input: { flex: 1, height: 42, borderRadius: 21, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, fontSize: 14, color: colors.ink },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' },
});

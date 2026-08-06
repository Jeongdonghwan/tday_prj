/** 차단 목록 관리 (글로벌 확장 Phase 3 · UGC 요건). listBlocks/unblock. */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { listBlocks, unblock, type Block } from '@/api/moderation';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { Avatar } from '@/components/Avatar';
import { colors, radius, weight } from '@/theme';

export default function BlockListScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { t } = useTranslation();
  const [items, setItems] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setItems((await listBlocks(token)).items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function onUnblock(b: Block) {
    if (!token) return;
    try {
      await unblock(b.block_id, token);
      setItems((prev) => prev.filter((x) => x.block_id !== b.block_id));
    } catch {
      /* noop */
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar title={t('report.blockList')} onBack={() => router.back()} />
      {loading ? (
        <ActivityIndicator color={colors.rose} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => String(b.block_id)}
          contentContainerStyle={items.length === 0 ? styles.empty : { padding: 16 }}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('report.blockEmpty')}</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Avatar avatarNo={(item.user_id % 12) + 1} size={36} />
              <Text style={styles.nick}>{item.nickname}</Text>
              <Pressable style={styles.btn} onPress={() => onUnblock(item)}>
                <Text style={styles.btnT}>{t('report.unblock')}</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: colors.sub2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.line },
  nick: { flex: 1, fontSize: 14, fontWeight: weight.semibold as '600', color: colors.ink },
  btn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 7 },
  btnT: { fontSize: 12.5, fontWeight: weight.bold as '700', color: colors.sub },
});

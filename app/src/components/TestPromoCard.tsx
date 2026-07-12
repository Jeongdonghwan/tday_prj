/** 심리테스트 홍보 카드 (DESIGN_UPDATE §6, 피드 헤더·이슈 아래). 출시 7일 내 테스트만. */
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { getTestPromo, type TestPromo } from '@/api/tests';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { colors, weight } from '@/theme';

export function TestPromoCard() {
  const { token } = useAuth();
  const router = useRouter();
  const [promo, setPromo] = useState<TestPromo>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setPromo((await getTestPromo(token)).test);
    } catch {
      setPromo(null);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!promo) return null;

  return (
    <Pressable style={styles.card} onPress={() => router.push('/tests')}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>NEW</Text>
      </View>
      <Text style={styles.text} numberOfLines={1}>{promo.title}</Text>
      <Icon name="chevronRight" size={18} color={colors.rose} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.roseBg,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  badge: { backgroundColor: colors.rose, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 10.5, fontWeight: weight.extrabold as '800', letterSpacing: 0.5 },
  text: { flex: 1, fontSize: 14, fontWeight: weight.bold as '700', color: colors.rose },
});

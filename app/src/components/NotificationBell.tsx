/** 알림 종 아이콘 + 안 읽음 빨간점. 화면 포커스 시 1회 조회(서버 경량). 탭 → 알림 화면. */
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { getNotifications } from '@/api/notifications';
import { useAuth } from '@/auth/AuthContext';
import { Icon } from '@/components/Icon';
import { getSeenAt, hasUnread } from '@/notifications/seen';
import { colors } from '@/theme';

export function NotificationBell({ size = 22 }: { size?: number }) {
  const { token } = useAuth();
  const router = useRouter();
  const [unread, setUnread] = useState(false);

  const check = useCallback(async () => {
    if (!token) return;
    try {
      const [{ items }, seen] = await Promise.all([getNotifications(token), getSeenAt()]);
      setUnread(hasUnread(items, seen));
    } catch {
      /* 조용히 */
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      check();
    }, [check]),
  );

  return (
    <Pressable onPress={() => router.push('/notifications')} hitSlop={8}>
      <Icon name="bell" size={size} color={colors.ink} />
      {unread && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.rose,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
});

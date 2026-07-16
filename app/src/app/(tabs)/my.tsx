/** 마이페이지 (스펙 §5-5). API 연동: 상태 전환 + D-day + 캘린더/커플 진입. */
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteMe, updateMe } from '@/api/auth';
import { getDday, type Dday } from '@/api/couple';
import { getTestBadge, type TestBadge } from '@/api/tests';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/components/AppBar';
import { Avatar } from '@/components/Avatar';
import { Icon, type IconName } from '@/components/Icon';
import { StatusChip } from '@/components/StatusChip';
import { useIsDesktop } from '@/hooks/useResponsive';
import { colors, radius, statusTheme, weight, type RelationshipStatus } from '@/theme';

const STATUSES: RelationshipStatus[] = ['couple', 'single', 'married'];

export default function MyScreen() {
  const { user, token, signOut, refresh } = useAuth();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [dday, setDday] = useState<Dday | null>(null);
  const [badge, setBadge] = useState<TestBadge>(null);
  const status = user?.relationship_status ?? 'single';
  const nickname = user?.nickname ?? '나';

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setDday(await getDday(token));
    } catch {
      /* noop */
    }
    try {
      setBadge((await getTestBadge(token)).badge);
    } catch {
      /* noop */
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function changeStatus(s: RelationshipStatus) {
    if (!token || s === status) return;
    try {
      await updateMe({ relationship_status: s }, token);
      await refresh();
    } catch {
      /* noop */
    }
  }

  async function doDeleteAccount() {
    if (!token) return;
    try {
      await deleteMe(token);
    } catch {
      /* 서버 오류여도 로컬 세션은 정리 */
    }
    await signOut();
  }

  function confirmDeleteAccount() {
    const msg = '탈퇴하면 프로필·커플 연결이 삭제되고 되돌릴 수 없어요. 계속할까요?';
    if (Platform.OS === 'web') {
      const g = globalThis as unknown as { confirm?: (m: string) => boolean };
      if (g.confirm?.('회원 탈퇴\n\n' + msg)) doDeleteAccount();
      return;
    }
    Alert.alert('회원 탈퇴', msg, [
      { text: '취소', style: 'cancel' },
      { text: '탈퇴하기', style: 'destructive', onPress: doDeleteAccount },
    ]);
  }

  const links: { icon: IconName; label: string; onPress: () => void }[] = [
    { icon: 'chat', label: '내 글·댓글', onPress: () => router.push('/my-activity') },
    { icon: 'heart', label: dday?.connected ? '공유 캘린더' : '캘린더', onPress: () => router.push('/calendar') },
    { icon: 'chat', label: '오늘의 질문 (커플)', onPress: () => router.push('/daily') },
    { icon: 'best', label: '연애 심리테스트', onPress: () => router.push('/tests') },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {!isDesktop && (
        <AppBar
          title="마이"
          right={
            <Pressable onPress={() => router.push('/profile-edit')} hitSlop={8}>
              <Icon name="settings" size={22} color={colors.ink} />
            </Pressable>
          }
        />
      )}
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Pressable style={styles.head} onPress={() => router.push('/profile-edit')}>
          <Avatar avatarNo={user?.avatar_no} size={56} />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{nickname}</Text>
              <StatusChip status={status} />
              <Text style={styles.editHint}>수정 ›</Text>
            </View>
            <Text style={styles.handle}>@{user?.id ?? '-'}</Text>
            {badge && (
              <Pressable style={styles.badge} onPress={() => router.push('/tests')}>
                <Avatar avatarNo={badge.avatar_no} size={18} />
                <Text style={styles.badgeText}>{badge.title}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>

        <Pressable
          style={styles.couple}
          onPress={() => router.push(dday?.connected ? '/calendar' : '/couple/connect')}>
          <View>
            {dday?.connected && dday.days != null ? (
              <>
                <Text style={styles.coupleS}>{dday.partner ?? '상대'}님과 함께한 지</Text>
                <Text style={styles.coupleD}>{dday.days}일째</Text>
                {dday.next && <Text style={styles.coupleP}>다음 기념일 · {dday.next.label} D-{dday.next.d_day}</Text>}
              </>
            ) : (
              <>
                <Text style={styles.coupleS}>커플 연결</Text>
                <Text style={styles.coupleD}>D-day 시작하기</Text>
                <Text style={styles.coupleP}>초대 코드로 둘만의 공간을 열어요</Text>
              </>
            )}
          </View>
          <Icon name="heartFill" size={40} color={colors.rose} />
        </Pressable>

        <View style={styles.switch}>
          <Text style={styles.switchLabel}>내 연애 상태</Text>
          <View style={styles.seg}>
            {STATUSES.map((s) => {
              const on = s === status;
              return (
                <Pressable key={s} style={[styles.segItem, on && styles.segItemOn]} onPress={() => changeStatus(s)}>
                  <Text style={[styles.segText, on && { color: statusTheme[s].fg }]}>{statusTheme[s].label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sec}>
          {links.map((l, i) => (
            <Pressable key={i} style={[styles.row, i === links.length - 1 && { borderBottomWidth: 0 }]} onPress={l.onPress}>
              <Icon name={l.icon} size={21} color={colors.ink} />
              <Text style={styles.rowLabel}>{l.label}</Text>
              <Icon name="chevronRight" size={18} color={colors.sub2} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.logout} onPress={signOut}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>

        <Pressable style={styles.withdraw} onPress={confirmDeleteAccount} hitSlop={8}>
          <Text style={styles.withdrawText}>회원 탈퇴</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 18, paddingTop: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { fontSize: 18, fontWeight: weight.extrabold as '800', color: colors.ink, letterSpacing: -0.4 },
  handle: { fontSize: 12.5, color: colors.sub, marginTop: 5 },
  editHint: { fontSize: 12, color: colors.sub2, fontWeight: weight.semibold as '600', marginLeft: 'auto' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: colors.roseBg, borderRadius: 999, paddingVertical: 3, paddingRight: 10, paddingLeft: 3, marginTop: 7 },
  badgeText: { fontSize: 11.5, fontWeight: weight.bold as '700', color: colors.rose },
  couple: { marginHorizontal: 20, marginBottom: 18, backgroundColor: colors.roseBg, borderRadius: radius.cardLg, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  coupleS: { fontSize: 11.5, fontWeight: weight.bold as '700', color: colors.rose, opacity: 0.85 },
  coupleD: { fontSize: 21, fontWeight: weight.extrabold as '800', color: colors.rose, letterSpacing: -0.4, marginTop: 3 },
  coupleP: { fontSize: 11.5, color: colors.rose, opacity: 0.8, marginTop: 3 },
  switch: { marginHorizontal: 20, marginBottom: 22 },
  switchLabel: { fontSize: 12.5, fontWeight: weight.extrabold as '800', color: colors.sub, marginBottom: 9 },
  seg: { flexDirection: 'row', backgroundColor: colors.soft, borderRadius: 13, padding: 4 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  segItemOn: { backgroundColor: colors.bg, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 13, fontWeight: weight.bold as '700', color: colors.sub },
  sec: { marginHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowLabel: { flex: 1, fontSize: 14.5, fontWeight: weight.semibold as '600', color: colors.ink },
  logout: { marginHorizontal: 20, marginTop: 18, paddingVertical: 14, alignItems: 'center' },
  logoutText: { fontSize: 14, color: colors.sub, fontWeight: weight.semibold as '600' },
  withdraw: { marginHorizontal: 20, marginTop: 2, paddingVertical: 8, alignItems: 'center' },
  withdrawText: { fontSize: 12.5, color: colors.sub2, fontWeight: weight.semibold as '600', textDecorationLine: 'underline' },
});

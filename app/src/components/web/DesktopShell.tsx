/**
 * 데스크톱(≥1240px) 3영역 셸 (Task 4-1): 상단 고정 GNB + 중앙 본문(max 600) + 우측 레일(280).
 * 하단 탭바·FAB 는 데스크톱에서 숨김((tabs)/_layout 에서 분기). 색·수치는 기존 토큰 재사용.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { BrandLogo } from '@/components/BrandLogo';
import { Icon } from '@/components/Icon';
import { NotificationBell } from '@/components/NotificationBell';
import { RightRail } from '@/components/web/RightRail';
import { colors, weight } from '@/theme';

const MENU = [
  { label: '홈', path: '/' },
  { label: '커뮤니티', path: '/community' },
  { label: '연애이슈', path: '/issues' },
] as const;

function GnbMenu() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <View style={styles.menu}>
      {MENU.map((m) => {
        const active = m.path === '/' ? pathname === '/' || pathname === '/index' : pathname.startsWith(m.path);
        return (
          <Pressable key={m.path} onPress={() => router.navigate(m.path)} style={styles.menuItem}>
            <Text style={[styles.menuText, active && styles.menuTextActive]}>{m.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TopGnb() {
  const router = useRouter();
  const { user } = useAuth();
  return (
    <View style={styles.gnb}>
      <View style={styles.gnbInner}>
        <View style={styles.gnbLeft}>
          <Pressable onPress={() => router.navigate('/')} hitSlop={6}>
            <BrandLogo height={22} />
          </Pressable>
          <GnbMenu />
        </View>
        <View style={styles.gnbRight}>
          <Pressable hitSlop={8} style={styles.iconBtn} onPress={() => router.push('/search')}>
            <Icon name="search" size={22} color={colors.ink} strokeWidth={1.9} />
          </Pressable>
          <View style={styles.iconBtn}>
            <NotificationBell />
          </View>
          <Pressable style={styles.writeBtn} onPress={() => router.push('/write')}>
            <Icon name="plus" size={18} color="#fff" strokeWidth={2.2} />
            <Text style={styles.writeText}>글쓰기</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={() => router.navigate('/my')}>
            <Avatar avatarNo={user?.avatar_no} size={32} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function DesktopShell({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <TopGnb />
      <View style={styles.body}>
        <View style={styles.columns}>
          {/* 좌: 위젯 레일, 우: 메인 본문 (좌우 스왑) */}
          <View style={styles.railCol}>
            <RightRail />
          </View>
          <View style={styles.center}>{children}</View>
        </View>
      </View>
    </View>
  );
}

const CONTENT_MAX = 600;
const RAIL_W = 280;
const GAP = 24;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.soft },
  gnb: {
    height: 60,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  gnbInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: CONTENT_MAX + RAIL_W + GAP + 48,
    width: '100%',
    marginHorizontal: 'auto',
    paddingHorizontal: 24,
  },
  gnbLeft: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  menu: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  menuItem: { paddingVertical: 6 },
  menuText: { fontSize: 15, fontWeight: weight.semibold as '600', color: colors.sub },
  menuTextActive: { color: colors.ink, fontWeight: weight.extrabold as '800' },
  gnbRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBtn: { padding: 2 },
  writeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.rose,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  writeText: { color: '#fff', fontSize: 13.5, fontWeight: weight.bold as '700' },
  body: { flex: 1, alignItems: 'center' },
  columns: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
    width: '100%',
    maxWidth: CONTENT_MAX + RAIL_W + GAP + 48,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  center: {
    flex: 1,
    maxWidth: CONTENT_MAX,
    backgroundColor: colors.bg,
    borderWidth: 0.5,
    borderColor: colors.line,
    borderRadius: 18,
    overflow: 'hidden',
  },
  railCol: { width: RAIL_W },
});

/**
 * 하단 5탭 (홈·커뮤니티·연애이슈·BEST·MY) + 커뮤니티 탭 글쓰기 FAB (IA 개편).
 * 커스텀 tabBar 로 목업 디자인(라인 아이콘 + 라벨)을 재현.
 * 데스크톱(≥1240, 웹)에서는 DesktopShell(상단 GNB+3영역)로 전환 (Task 4-1).
 */
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { DesktopShell } from '@/components/web/DesktopShell';
import { useIsDesktop } from '@/hooks/useResponsive';
import { colors, weight } from '@/theme';

// GNB 5탭 (IA 개편): 홈·커뮤니티·연애이슈·BEST·마이
const TAB_META: Record<string, { label: string; icon: IconName }> = {
  index: { label: '홈', icon: 'home' },
  community: { label: '커뮤니티', icon: 'community' },
  issues: { label: '연애이슈', icon: 'news' },
  best: { label: 'BEST', icon: 'best' },
  my: { label: 'MY', icon: 'user' },
};

/** 커스텀 tabBar 에 전달되는 props 중 사용하는 부분만 (react-navigation 호환). */
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

function CustomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name];
        if (!meta) return null;
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable key={route.key} style={styles.tab} onPress={onPress}>
            <Icon name={meta.icon} size={23} color={focused ? colors.ink : colors.sub2} strokeWidth={1.9} />
            <Text style={[styles.label, { color: focused ? colors.ink : colors.sub2 }]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function WriteFab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  // 글쓰기 FAB 는 커뮤니티 탭에서만 (IA 개편)
  if (pathname !== '/community') return null;
  return (
    <Pressable
      style={[styles.fab, { bottom: 60 + insets.bottom + 16 }]}
      onPress={() => router.push('/write')}>
      <Icon name="plus" size={26} color="#fff" strokeWidth={2.2} />
    </Pressable>
  );
}

export default function TabsLayout() {
  const isDesktop = useIsDesktop();

  const tabs = (
    // 데스크톱(≥1240)은 상단 GNB 를 쓰므로 하단 탭바 숨김
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={isDesktop ? () => null : (props) => <CustomTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="issues" />
      <Tabs.Screen name="best" />
      <Tabs.Screen name="my" />
    </Tabs>
  );

  // 데스크톱: 3영역 셸로 감싸고 FAB 미노출
  if (isDesktop) return <DesktopShell>{tabs}</DesktopShell>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {tabs}
      <WriteFab />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 9, paddingBottom: 9, gap: 3 },
  label: { fontSize: 10.5, fontWeight: weight.semibold as '600' },
  fab: {
    position: 'absolute',
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.rose,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.rose,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});

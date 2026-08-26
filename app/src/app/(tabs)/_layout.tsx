/**
 * 하단 5탭 (홈·커뮤니티·오늘연애(중앙 돌출)·연애이슈·MY) + 커뮤니티 탭 글쓰기 FAB.
 * 커스텀 tabBar 로 목업 디자인(라인 아이콘 + 라벨, 중앙 하트 돌출)을 재현.
 * 데스크톱(≥1240, 웹)에서는 DesktopShell(상단 GNB+3영역)로 전환.
 */
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { BottomNavView, type NavName } from '@/components/BottomNav';
import { useIsDesktop } from '@/hooks/useResponsive';
import { colors } from '@/theme';

/** 커스텀 tabBar 에 전달되는 props 중 사용하는 부분만 (react-navigation 호환). */
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

function CustomTabBar({ state, navigation }: TabBarProps) {
  const focused = state.routes[state.index]?.name as NavName | undefined;
  const onPress = (name: NavName) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (focused !== name && !event.defaultPrevented) navigation.navigate(name);
  };
  return <BottomNavView active={focused ?? null} onPress={onPress} />;
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
      <Tabs.Screen name="fortune" />
      <Tabs.Screen name="issues" />
      <Tabs.Screen name="my" />
      {/* best 라우트는 유지하되 탭바에서 숨김 (커뮤니티/홈에서 진입) */}
      <Tabs.Screen name="best" options={{ href: null }} />
    </Tabs>
  );

  // 데스크톱: 셸(GNB+3영역)은 루트 _layout 에서 감싸므로 여기선 탭바·FAB 만 숨김
  if (isDesktop) return tabs;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {tabs}
      <WriteFab />
    </View>
  );
}

const styles = StyleSheet.create({
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

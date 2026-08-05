/**
 * 하단 5탭 (홈·커뮤니티·오늘연애(중앙 돌출)·연애이슈·MY) + 커뮤니티 탭 글쓰기 FAB.
 * 커스텀 tabBar 로 목업 디자인(라인 아이콘 + 라벨, 중앙 하트 돌출)을 재현.
 * 데스크톱(≥1240, 웹)에서는 DesktopShell(상단 GNB+3영역)로 전환.
 */
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Icon, type IconName } from '@/components/Icon';
import { useIsDesktop } from '@/hooks/useResponsive';
import { colors, weight } from '@/theme';

// GNB 5탭 (오늘연애 개편): 홈·커뮤니티·오늘연애(중앙 돌출)·연애이슈·마이
// order 로 탭바 노출 순서 고정. center=true 는 하트 원형 돌출 탭. (BEST 는 탭바에서 제거, 라우트는 유지)
const TAB_META: Record<string, { labelKey: string; icon: IconName; order: number; center?: boolean }> = {
  index: { labelKey: 'tabs.home', icon: 'home', order: 0 },
  community: { labelKey: 'tabs.community', icon: 'community', order: 1 },
  fortune: { labelKey: 'tabs.fortune', icon: 'heartFill', order: 2, center: true },
  issues: { labelKey: 'tabs.issues', icon: 'news', order: 3 },
  my: { labelKey: 'tabs.my', icon: 'user', order: 4 },
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
  const { t } = useTranslation();
  // TAB_META.order 로 노출 순서 고정 (route 등록 순서와 무관하게 오늘연애를 중앙에)
  const items = state.routes
    .map((route, index) => ({ route, index, meta: TAB_META[route.name] }))
    .filter((x) => !!x.meta)
    .sort((a, b) => a.meta!.order - b.meta!.order);

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {items.map(({ route, index, meta }) => {
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (meta!.center) {
          return (
            <Pressable key={route.key} style={styles.tab} onPress={onPress}>
              <View style={styles.center}>
                <LinearGradient colors={[colors.rose, '#D92B4E']} style={styles.heart}>
                  <Icon name={meta!.icon} size={26} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={[styles.label, styles.centerLabel]}>{t(meta!.labelKey)}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} style={styles.tab} onPress={onPress}>
            <Icon name={meta!.icon} size={23} color={focused ? colors.ink : colors.sub2} strokeWidth={1.9} />
            <Text style={[styles.label, { color: focused ? colors.ink : colors.sub2 }]}>{t(meta!.labelKey)}</Text>
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
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 9, paddingBottom: 9, gap: 3 },
  label: { fontSize: 10.5, fontWeight: weight.semibold as '600' },
  // 중앙 오늘연애 탭 — 하트 원형 돌출 (fortune_tab.html .gnb .center)
  center: { marginTop: -22 },
  heart: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.rose,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  centerLabel: { color: colors.rose, fontWeight: weight.extrabold as '800' },
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

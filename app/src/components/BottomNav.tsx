/**
 * 하단 GNB 공용 뷰 — 탭 화면(Tabs tabBar)과 스택 화면(글상세·이슈상세 등) 양쪽에서 같은 UI 를 그린다.
 * 홈·커뮤니티·오늘연애(중앙 하트 돌출)·연애이슈·MY. 색·수치는 fortune_tab.html GNB 그대로.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Icon, type IconName } from '@/components/Icon';
import { colors, weight } from '@/theme';

export type NavName = 'index' | 'community' | 'fortune' | 'issues' | 'my';

export const NAV_ITEMS: { name: NavName; path: string; labelKey: string; icon: IconName; center?: boolean }[] = [
  { name: 'index', path: '/', labelKey: 'tabs.home', icon: 'home' },
  { name: 'community', path: '/community', labelKey: 'tabs.community', icon: 'community' },
  { name: 'fortune', path: '/fortune', labelKey: 'tabs.fortune', icon: 'heartFill', center: true },
  { name: 'issues', path: '/issues', labelKey: 'tabs.issues', icon: 'news' },
  { name: 'my', path: '/my', labelKey: 'tabs.my', icon: 'user' },
];

export function BottomNavView({ active, onPress }: { active: NavName | null; onPress: (name: NavName) => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {NAV_ITEMS.map((item) => {
        const focused = active === item.name;
        if (item.center) {
          return (
            <Pressable key={item.name} style={styles.tab} onPress={() => onPress(item.name)}>
              <View style={styles.center}>
                <LinearGradient colors={[colors.rose, '#D92B4E']} style={styles.heart}>
                  <Icon name={item.icon} size={26} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={[styles.label, styles.centerLabel]}>{t(item.labelKey)}</Text>
            </Pressable>
          );
        }
        return (
          <Pressable key={item.name} style={styles.tab} onPress={() => onPress(item.name)}>
            <Icon name={item.icon} size={23} color={focused ? colors.ink : colors.sub2} strokeWidth={1.9} />
            <Text style={[styles.label, { color: focused ? colors.ink : colors.sub2 }]}>{t(item.labelKey)}</Text>
          </Pressable>
        );
      })}
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
});

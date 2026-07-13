/**
 * 공용 광고 슬롯. 활성 광고 있으면 이미지+AD 라벨+아웃링크, 없으면 null(placeholder 금지).
 * 포지션별 1회 fetch(모듈 캐시)로 노출/요청 폭주 방지. impressions=서버 GET, clicks=클릭 엔드포인트.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';

import { clickAd, getAd, type Ad, type AdPosition } from '@/api/ads';
import { colors, weight } from '@/theme';

const cache: Partial<Record<AdPosition, Promise<Ad | null>>> = {};
function fetchAd(position: AdPosition) {
  if (!cache[position]) cache[position] = getAd(position).then((r) => r.ad).catch(() => null);
  return cache[position]!;
}

export function AdSlot({ position }: { position: AdPosition }) {
  const [ad, setAd] = useState<Ad | null>(null);
  useEffect(() => {
    let alive = true;
    fetchAd(position).then((a) => alive && setAd(a));
    return () => {
      alive = false;
    };
  }, [position]);

  if (!ad) return null;

  const onPress = () => {
    clickAd(ad.id).catch(() => {});
    WebBrowser.openBrowserAsync(ad.link_url);
  };

  const fixed =
    position === 'web_rail'
      ? { width: 300, height: 100 }
      : position === 'web_wing_l' || position === 'web_wing_r'
        ? { width: 240, height: 600 }
        : null; // feed_native / issue_bottom = 가변 폭 배너

  return (
    <View style={fixed ? undefined : styles.banner}>
      <Pressable onPress={onPress} style={styles.press}>
        <Image
          source={{ uri: ad.image }}
          style={[styles.img, fixed ?? styles.bannerImg]}
          contentFit="cover"
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AD</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: 16, marginTop: 4, marginBottom: 10 },
  press: { position: 'relative' },
  img: { borderRadius: 12, backgroundColor: colors.soft },
  bannerImg: { width: '100%', height: 96 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: { fontSize: 9, fontWeight: weight.bold as '700', color: colors.caption, letterSpacing: 0.5 },
});

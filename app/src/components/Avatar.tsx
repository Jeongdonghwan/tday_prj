/**
 * 공용 아바타 (DESIGN_UPDATE §1).
 * profileImg 있으면 원형 크롭 이미지, 없으면 기본 아바타 12종 중 avatarNo.
 * 표시 크기: 피드 34 / 댓글 28 / 대댓글 24 / 프로필 56 / 설정·상단 32.
 */
import { Image, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { avatarXml } from '@/avatars';

type Props = {
  avatarNo?: number | null;
  profileImg?: string | null;
  size?: number;
};

export function Avatar({ avatarNo, profileImg, size = 34 }: Props) {
  if (profileImg) {
    return (
      <Image
        source={{ uri: profileImg }}
        style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }
  return (
    <View style={{ width: size, height: size }}>
      <SvgXml xml={avatarXml(avatarNo)} width={size} height={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: '#F0F1F3' },
});

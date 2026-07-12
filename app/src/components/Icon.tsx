/**
 * 라인 아이콘 세트 — 목업 SVG 패스를 그대로 포팅 (스펙 §4: stroke 1.8~1.9, 이모지 금지).
 * 사용: <Icon name="home" size={23} color={colors.ink} />
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

export type IconName =
  | 'home'
  | 'best'
  | 'chat'
  | 'user'
  | 'plus'
  | 'search'
  | 'bell'
  | 'back'
  | 'chevronRight'
  | 'heart'
  | 'heartFill'
  | 'fire'
  | 'vote'
  | 'bookmark'
  | 'settings'
  | 'share'
  | 'more'
  | 'info'
  | 'community'
  | 'news';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** 채움형(fire/heartFill 등)일 때 fill 색 */
  fill?: string;
};

export function Icon({ name, size = 22, color = colors.ink, strokeWidth = 1.8, fill }: Props) {
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 10.5L12 3l9 7.5" {...stroke} />
          <Path d="M5 9.5V20h14V9.5" {...stroke} />
        </Svg>
      );
    case 'best':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 2l2.6 6.4L21 9l-5 4.3L17.5 20 12 16.5 6.5 20 8 13.3 3 9l6.4-.6z" {...stroke} />
        </Svg>
      );
    case 'chat':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-4.2A8.4 8.4 0 1 1 21 11.5z" {...stroke} />
          <Circle cx="8.5" cy="11.5" r="0.9" fill={color} />
          <Circle cx="12" cy="11.5" r="0.9" fill={color} />
          <Circle cx="15.5" cy="11.5" r="0.9" fill={color} />
        </Svg>
      );
    case 'user':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="8" r="4" {...stroke} />
          <Path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" {...stroke} />
        </Svg>
      );
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 5v14M5 12h14" {...stroke} strokeWidth={strokeWidth + 0.4} />
        </Svg>
      );
    case 'search':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="11" cy="11" r="7" {...stroke} />
          <Path d="M20 20l-3.5-3.5" {...stroke} />
        </Svg>
      );
    case 'bell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 8-3 8h18s-3-1-3-8" {...stroke} />
          <Path d="M10.5 21a1.8 1.8 0 0 0 3 0" {...stroke} />
        </Svg>
      );
    case 'back':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M15 18l-6-6 6-6" {...stroke} strokeWidth={strokeWidth + 0.1} />
        </Svg>
      );
    case 'chevronRight':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 6l6 6-6 6" {...stroke} strokeWidth={strokeWidth + 0.2} />
        </Svg>
      );
    case 'heart':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 21s-7-4.6-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.4 12 21 12 21z" {...stroke} />
        </Svg>
      );
    case 'heartFill':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 21s-7-4.6-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.4 12 21 12 21z" fill={fill ?? color} />
        </Svg>
      );
    case 'fire':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 2c1 4-2 5-2 8a4 4 0 0 0 8 0c0-1-1-2-1-2 2 2 3 4 3 6a8 8 0 0 1-16 0c0-5 5-7 6-12z" fill={fill ?? color} />
        </Svg>
      );
    case 'vote':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 11l3 3 8-8" {...stroke} strokeWidth={2} />
          <Path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" {...stroke} strokeWidth={2} />
        </Svg>
      );
    case 'bookmark':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" {...stroke} />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="3" {...stroke} />
          <Path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8M4.6 9a1.6 1.6 0 0 0-.3-1.8M12 2v2M12 20v2M4 12H2M22 12h-2" {...stroke} />
        </Svg>
      );
    case 'share':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8" {...stroke} />
          <Path d="M16 6l-4-4-4 4M12 2v14" {...stroke} />
        </Svg>
      );
    case 'more':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="5" r="1.6" {...stroke} />
          <Circle cx="12" cy="12" r="1.6" {...stroke} />
          <Circle cx="12" cy="19" r="1.6" {...stroke} />
        </Svg>
      );
    case 'info':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" {...stroke} strokeWidth={2} />
          <Path d="M12 8v5M12 16h.01" {...stroke} strokeWidth={2} />
        </Svg>
      );
    case 'community':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="9" cy="8" r="3.2" {...stroke} />
          <Path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" {...stroke} />
          <Circle cx="17.5" cy="9.5" r="2.4" {...stroke} />
          <Path d="M16 15c2.6 0 5 1.8 5 5" {...stroke} />
        </Svg>
      );
    case 'news':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="3" y="4" width="13" height="16" rx="2" {...stroke} />
          <Path d="M16 8h3a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2" {...stroke} />
          <Path d="M6.5 8.5h6M6.5 12h6M6.5 15.5h4" {...stroke} />
        </Svg>
      );
    default:
      return null;
  }
}

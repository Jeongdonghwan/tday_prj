/**
 * 홈 퀵메뉴 8종 (게시판 개편). 이모지 타일 + 틴트 배경.
 * community = 게시판 카테고리 진입, photo = 인증·사진 앨범(/photos).
 */
export type QuickItem =
  | { key: string; label: string; emoji: string; bg: string; kind: 'photo' }
  | { key: string; label: string; emoji: string; bg: string; kind: 'community'; category: string };

export const QUICK_ITEMS: QuickItem[] = [
  { key: 'love', label: '연애고민', emoji: '❤️', bg: '#FDEAEE', kind: 'community', category: 'love' },
  { key: 'dating', label: '썸·소개팅', emoji: '💕', bg: '#FBEAF3', kind: 'community', category: 'dating' },
  { key: 'marriage', label: '결혼·동거', emoji: '💍', bg: '#F3EEFB', kind: 'community', category: 'marriage' },
  { key: 'relations', label: '인간관계', emoji: '👨‍👩‍👧', bg: '#E4F3E7', kind: 'community', category: 'counsel' },
  { key: 'daily', label: '일상잡담', emoji: '💭', bg: '#EAF0FE', kind: 'community', category: 'daily' },
  { key: 'photo', label: '인증·사진', emoji: '📸', bg: '#FCF0DC', kind: 'photo' },
  { key: 'free', label: '자유게시판', emoji: '🎉', bg: '#FDEBD6', kind: 'community', category: 'free' },
  { key: 'all', label: '전체', emoji: '📋', bg: '#F1F2F4', kind: 'community', category: 'all' },
];

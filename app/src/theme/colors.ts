/**
 * 디자인 토큰 — 색상 (스펙 §4 / 목업 :root 변수와 1:1)
 */
export const colors = {
  ink: '#17181C', // 기본 텍스트
  sub: '#9398A1', // 보조 텍스트
  sub2: '#C2C6CC', // 비활성
  line: '#F0F1F3', // 구분선
  soft: '#F7F8F9', // 옅은 배경
  bg: '#FFFFFF',

  // 액센트 / 상태칩
  rose: '#F23B5F', // 커플, 브랜드 메인
  roseBg: '#FDEAEE',
  blue: '#3B72F0', // 돌싱
  blueBg: '#EAF0FE',
  navy: '#33425E', // 유부
  navyBg: '#E8ECF4',

  // 본문 보조 톤 (목업에서 등장)
  body: '#34373D',
  bodySoft: '#5C616A',

  // 투표 결과바 색 총량 규제 (투표 카드 프레젠테이션 개편)
  neutralBar: '#E4E7EC', // 결과바 열세/동률 세그먼트 (뉴트럴 그레이)
  caption: '#B9BEC6', // "투표 · n명 참여" 캡션
  statusText: '#868C95', // 닉네임 옆 "· 커플" 상태 텍스트
} as const;

/** 연애 상태 → 칩 테마 매핑 (커플=rose / 돌싱=blue / 유부=navy) */
export const statusTheme = {
  couple: { label: '커플', fg: colors.rose, bg: colors.roseBg },
  single: { label: '돌싱', fg: colors.blue, bg: colors.blueBg },
  married: { label: '유부', fg: colors.navy, bg: colors.navyBg },
} as const;

export type RelationshipStatus = keyof typeof statusTheme;

/** 글 카테고리 라벨 (게시판 개편, 서버 enum ↔ 한글) */
export const categoryLabel = {
  love: '연애',
  dating: '썸·소개팅',
  marriage: '결혼·동거',
  counsel: '인간관계',
  daily: '일상잡담',
  free: '자유',
  photo: '인증·사진',
} as const;

export type PostCategory = keyof typeof categoryLabel;

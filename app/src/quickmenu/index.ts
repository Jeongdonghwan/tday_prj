/**
 * 홈 퀵메뉴 8종 (게시판 개편). 자립형 48×48 SVG 아이콘(틴트 라운드 배경 포함, 아바타와 동일 방식).
 * community = 게시판 카테고리 진입, photo = 인증·사진 앨범(초기 비활성, /photos).
 */
export type QuickItem =
  | { key: string; label: string; xml: string; kind: 'photo' }
  | { key: string; label: string; xml: string; kind: 'community'; category: string };

const W = (bg: string, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="15" fill="${bg}"/><g transform="translate(4.8,4.8) scale(0.8)">${inner}</g></svg>`;

// 연애고민 — 말풍선 + 하트
const LOVE = W('#FDEAEE', '<path d="M13,8 h22 a7,7 0 0 1 7,7 v10 a7,7 0 0 1 -7,7 H22 l-7,7 v-7 h-2 a7,7 0 0 1 -7,-7 V15 a7,7 0 0 1 7,-7 z" fill="#F58AA0"/><path d="M24,29 Q15,23.5 15,17.8 Q15,13.5 19,13.5 Q22,13.5 24,16.5 Q26,13.5 29,13.5 Q33,13.5 33,17.8 Q33,23.5 24,29 Z" fill="#FFFFFF"/>');
// 썸·소개팅 — 겹친 두 하트
const DATING = W('#FBEAF3', '<path d="M15,31 Q6,25 6,18.5 Q6,14 10,14 Q13,14 15,17 Q17,14 20,14 Q24,14 24,18.5 Q24,25 15,31 Z" fill="#E9A6C6"/><path d="M28,35 Q17,28 17,20.5 Q17,15 22,15 Q25.5,15 28,18.5 Q30.5,15 34,15 Q39,15 39,20.5 Q39,28 28,35 Z" fill="#F23B5F"/>');
// 결혼·동거 — 커플 링
const MARRIAGE = W('#F3EEFB', '<circle cx="19" cy="27" r="11" fill="none" stroke="#8E6ED0" stroke-width="3.6"/><circle cx="30" cy="27" r="11" fill="none" stroke="#C0AEE9" stroke-width="3.6"/><path d="M15,12 L19,7 L23,12 L19,16 Z" fill="#8E6ED0"/>');
// 인간관계 — 두 사람
const RELATIONS = W('#E4F3E7', '<circle cx="17" cy="17" r="6.5" fill="#4C9E6A"/><path d="M6.5,37 a10.5,9 0 0 1 21,0 Z" fill="#4C9E6A"/><circle cx="33" cy="19" r="5.2" fill="#9CCBAB"/><path d="M25,37 a8.5,7.5 0 0 1 17,0 Z" fill="#9CCBAB"/>');
// 일상잡담 — 말풍선(점)
const DAILY = W('#EFECFB', '<path d="M12,8 h20 a6.5,6.5 0 0 1 6.5,6.5 v5 a6.5,6.5 0 0 1 -6.5,6.5 h-2 a6.5,6.5 0 0 1 -6.5,-6.5 v-5 a6.5,6.5 0 0 0 -6.5,-6.5 z" fill="#B9AEE8"/><path d="M13,17 h18 a6.5,6.5 0 0 1 6.5,6.5 v5 a6.5,6.5 0 0 1 -6.5,6.5 H22 l-6.5,6 v-6 h-2.5 A6.5,6.5 0 0 1 6.5,28.5 v-5 A6.5,6.5 0 0 1 13,17 Z" fill="#6A54C9"/><circle cx="16.5" cy="26.3" r="2" fill="#fff"/><circle cx="22.5" cy="26.3" r="2" fill="#fff"/><circle cx="28.5" cy="26.3" r="2" fill="#fff"/>');
// 썰·후기 — 후기 노트(줄) + 접힌 모서리
const STORY = W('#FCF0DC', '<path d="M11,6 h17 l8,8 v26 a3,3 0 0 1 -3,3 H11 a3,3 0 0 1 -3,-3 V9 a3,3 0 0 1 3,-3 z" fill="#E8A93E"/><path d="M28,6 v6 a2,2 0 0 0 2,2 h6 z" fill="#C98A22"/><rect x="14" y="20" width="18" height="2.8" rx="1.4" fill="#FFF6E4"/><rect x="14" y="26" width="18" height="2.8" rx="1.4" fill="#FFF6E4"/><rect x="14" y="32" width="11" height="2.8" rx="1.4" fill="#FFF6E4"/>');
// 자유게시판 — 확성기
const FREE = W('#FDEBD6', '<path d="M8,20 L27,12 v24 L8,28 z" fill="#EE8E3C"/><rect x="4" y="20" width="6" height="8" rx="2" fill="#EE8E3C"/><rect x="13" y="27" width="5" height="11" rx="2.5" fill="#EE8E3C"/><path d="M31,17 a9,9 0 0 1 0,14" fill="none" stroke="#F6B877" stroke-width="3.2" stroke-linecap="round"/>');
// 전체 — 그리드
const ALL = W('#F1F2F4', '<rect x="9" y="9" width="13" height="13" rx="4" fill="#868C95"/><rect x="26" y="9" width="13" height="13" rx="4" fill="#B9BEC6"/><rect x="9" y="26" width="13" height="13" rx="4" fill="#B9BEC6"/><rect x="26" y="26" width="13" height="13" rx="4" fill="#868C95"/>');

export const QUICK_ITEMS: QuickItem[] = [
  { key: 'love', label: '연애고민', xml: LOVE, kind: 'community', category: 'love' },
  { key: 'dating', label: '썸·소개팅', xml: DATING, kind: 'community', category: 'dating' },
  { key: 'marriage', label: '결혼·동거', xml: MARRIAGE, kind: 'community', category: 'marriage' },
  { key: 'relations', label: '인간관계', xml: RELATIONS, kind: 'community', category: 'counsel' },
  { key: 'daily', label: '일상잡담', xml: DAILY, kind: 'community', category: 'daily' },
  { key: 'story', label: '썰·후기', xml: STORY, kind: 'community', category: 'story' },
  { key: 'free', label: '자유게시판', xml: FREE, kind: 'community', category: 'free' },
  { key: 'all', label: '전체', xml: ALL, kind: 'community', category: 'all' },
];

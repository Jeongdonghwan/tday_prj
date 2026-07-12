/**
 * 홈 퀵메뉴 8종 (HOME_UPDATE §2-2). 틴트 라운드 배경 포함 자립형 48×48 SVG.
 * 카테고리 매핑(기존 love/marriage/counsel/free 4종, DECISIONS): 재테크/직장/일상→free, 가족→counsel.
 */
export type QuickItem =
  | { key: string; label: string; xml: string; kind: 'tests' }
  | { key: string; label: string; xml: string; kind: 'community'; category: string };

const QM_01 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="15" fill="#FDEAEE"/><g transform="translate(4.8,4.8) scale(0.8)"><path d="M24,40 Q8,29 8,18.5 Q8,10 15.5,10 Q21,10 24,15.5 Q27,10 32.5,10 Q40,10 40,18.5 Q40,29 24,40 Z" fill="#F23B5F"/><path d="M17,19 Q19.5,15 24,16.5" fill="none" stroke="#FBC2CD" stroke-width="2.6" stroke-linecap="round"/><circle cx="33" cy="31" r="7.5" fill="#FFFFFF" stroke="#8A1F35" stroke-width="2.4"/><path d="M38.5,36.5 L43,41" stroke="#8A1F35" stroke-width="3" stroke-linecap="round"/><path d="M30.5,31 L32.4,33 L36,29.4" fill="none" stroke="#F23B5F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
const QM_02 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="15" fill="#FDEAEE"/><g transform="translate(4.8,4.8) scale(0.8)"><path d="M13,8 h22 a7,7 0 0 1 7,7 v10 a7,7 0 0 1 -7,7 H22 l-7,7 v-7 h-2 a7,7 0 0 1 -7,-7 V15 a7,7 0 0 1 7,-7 z" fill="#F58AA0"/><path d="M24,29 Q15,23.5 15,17.8 Q15,13.5 19,13.5 Q22,13.5 24,16.5 Q26,13.5 29,13.5 Q33,13.5 33,17.8 Q33,23.5 24,29 Z" fill="#FFFFFF"/></g></svg>`;
const QM_03 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="15" fill="#FBEAF3"/><g transform="translate(4.8,4.8) scale(0.8)"><circle cx="19" cy="27" r="11" fill="none" stroke="#D4649B" stroke-width="3.6"/><circle cx="30" cy="27" r="11" fill="none" stroke="#E9A6C6" stroke-width="3.6"/><path d="M15,12 L19,7 L23,12 L19,16 Z" fill="#D4649B"/></g></svg>`;
const QM_04 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="15" fill="#FCF0DC"/><g transform="translate(4.8,4.8) scale(0.8)"><circle cx="18" cy="27" r="12" fill="#F0C05E"/><circle cx="29" cy="23" r="12.5" fill="#E8A93E"/><circle cx="29" cy="23" r="8.8" fill="none" stroke="#D18A19" stroke-width="2"/><text x="29" y="27.8" text-anchor="middle" font-family="Pretendard,sans-serif" font-size="12.5" font-weight="800" fill="#FFFFFF">₩</text></g></svg>`;
const QM_05 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="15" fill="#EAF0FE"/><g transform="translate(4.8,4.8) scale(0.8)"><rect x="7" y="15" width="34" height="24" rx="4" fill="#3B72F0"/><path d="M18,15 v-3.5 a3,3 0 0 1 3,-3 h6 a3,3 0 0 1 3,3 V15" fill="none" stroke="#3B72F0" stroke-width="3.4"/><rect x="7" y="24" width="34" height="4" fill="#9FBCF8"/><rect x="21" y="21.5" width="6" height="7" rx="2" fill="#FFFFFF"/></g></svg>`;
const QM_06 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="15" fill="#E4F3E7"/><g transform="translate(4.8,4.8) scale(0.8)"><circle cx="17" cy="17" r="6.5" fill="#4C9E6A"/><path d="M6.5,37 a10.5,9 0 0 1 21,0 Z" fill="#4C9E6A"/><circle cx="33" cy="19" r="5.2" fill="#9CCBAB"/><path d="M25,37 a8.5,7.5 0 0 1 17,0 Z" fill="#9CCBAB"/></g></svg>`;
const QM_07 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="15" fill="#EFECFB"/><g transform="translate(4.8,4.8) scale(0.8)"><path d="M12,8 h20 a6.5,6.5 0 0 1 6.5,6.5 v5 a6.5,6.5 0 0 1 -6.5,6.5 h-2 a6.5,6.5 0 0 1 -6.5,-6.5 v-5 a6.5,6.5 0 0 0 -6.5,-6.5 z" fill="#B9AEE8"/><path d="M13,17 h18 a6.5,6.5 0 0 1 6.5,6.5 v5 a6.5,6.5 0 0 1 -6.5,6.5 H22 l-6.5,6 v-6 h-2.5 A6.5,6.5 0 0 1 6.5,28.5 v-5 A6.5,6.5 0 0 1 13,17 Z" fill="#6A54C9"/><circle cx="16.5" cy="26.3" r="2" fill="#fff"/><circle cx="22.5" cy="26.3" r="2" fill="#fff"/><circle cx="28.5" cy="26.3" r="2" fill="#fff"/></g></svg>`;
const QM_08 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="15" fill="#F1F2F4"/><g transform="translate(4.8,4.8) scale(0.8)"><rect x="9" y="9" width="13" height="13" rx="4" fill="#868C95"/><rect x="26" y="9" width="13" height="13" rx="4" fill="#B9BEC6"/><rect x="9" y="26" width="13" height="13" rx="4" fill="#B9BEC6"/><rect x="26" y="26" width="13" height="13" rx="4" fill="#868C95"/></g></svg>`;

export const QUICK_ITEMS: QuickItem[] = [
  { key: 'test', label: '연애유형테스트', xml: QM_01, kind: 'tests' },
  { key: 'love', label: '연애고민', xml: QM_02, kind: 'community', category: 'love' },
  { key: 'wedding', label: '예비부부·결혼', xml: QM_03, kind: 'community', category: 'marriage' },
  { key: 'money', label: '재테크고민', xml: QM_04, kind: 'community', category: 'free' },
  { key: 'work', label: '직장·커리어', xml: QM_05, kind: 'community', category: 'free' },
  { key: 'family', label: '가족·인간관계', xml: QM_06, kind: 'community', category: 'counsel' },
  { key: 'chat', label: '일상잡담', xml: QM_07, kind: 'community', category: 'free' },
  { key: 'all', label: '전체 게시판', xml: QM_08, kind: 'community', category: 'all' },
];

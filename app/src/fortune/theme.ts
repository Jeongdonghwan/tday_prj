/** 연애운세 전용 색상 (프로토타입 fortune_tab.html 값 그대로). */
export const night = {
  g1: '#1C1430',
  g2: '#3A1E4A',
  g3: '#6E2350',
  gold: '#F5C36B',
  amber: '#E8A33D',
  blue: '#4A7DE0',
};

/** 미드나잇 카드 그라데이션 (155deg 근사 — LinearGradient start/end). */
export const nightGradient = {
  colors: [night.g1, night.g2, night.g3] as const,
  locations: [0, 0.55, 1] as const,
  start: { x: 0.15, y: 0 },
  end: { x: 0.85, y: 1 },
};

/** 디자인 시스템 통합 export (스펙 §4). 단일 출처. */
export { colors, statusTheme, categoryLabel } from './colors';
export type { RelationshipStatus, PostCategory } from './colors';
export { radius, spacing } from './radius';
export { weight, font, fontSize, pretendardFamily } from './typography';
export type { Weight } from './typography';

import { colors } from './colors';
import { radius, spacing } from './radius';
import { fontSize } from './typography';

export const theme = { colors, radius, spacing, fontSize } as const;

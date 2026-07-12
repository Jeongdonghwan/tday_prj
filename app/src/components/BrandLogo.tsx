/** 브랜드 로고/심볼 (오늘연애). react-native-svg SvgXml 로 렌더 (아바타 방식 재사용). */
import { SvgXml } from 'react-native-svg';

// 가로 로고 (심볼 + "오늘연애" 워드마크) — viewBox 168×34
const LOGO_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 168 34"><path d="M4,4 a4,4 0 0 0 -4,4 v14 a4,4 0 0 0 4,4 h5 l3,6 l5,-6 h15 a4,4 0 0 0 4,-4 v-14 a4,4 0 0 0 -4,-4 z" fill="#F23B5F"/><path d="M18,22.5 Q9.5,17 9.5,11.8 Q9.5,7.8 13.2,7.8 Q16,7.8 18,10.6 Q20,7.8 22.8,7.8 Q26.5,7.8 26.5,11.8 Q26.5,17 18,22.5 Z" fill="#FFF2F0"/><text x="44" y="25.5" font-family="Pretendard, sans-serif" font-size="24" font-weight="800" letter-spacing="-1" fill="#1A1B1E">오늘연애</text></svg>`;

// 심볼 단독 — viewBox 36×34
const SYMBOL_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 34"><path d="M4,4 a4,4 0 0 0 -4,4 v14 a4,4 0 0 0 4,4 h5 l3,6 l5,-6 h15 a4,4 0 0 0 4,-4 v-14 a4,4 0 0 0 -4,-4 z" fill="#F23B5F"/><path d="M18,22.5 Q9.5,17 9.5,11.8 Q9.5,7.8 13.2,7.8 Q16,7.8 18,10.6 Q20,7.8 22.8,7.8 Q26.5,7.8 26.5,11.8 Q26.5,17 18,22.5 Z" fill="#FFF2F0"/></svg>`;

const LOGO_RATIO = 168 / 34;

/** 가로 로고. height 기준 (기본 22). */
export function BrandLogo({ height = 22 }: { height?: number }) {
  return <SvgXml xml={LOGO_XML} width={height * LOGO_RATIO} height={height} />;
}

/** 심볼 단독 (파비콘·빈 상태). */
export function BrandSymbol({ size = 28 }: { size?: number }) {
  return <SvgXml xml={SYMBOL_XML} width={size * (36 / 34)} height={size} />;
}

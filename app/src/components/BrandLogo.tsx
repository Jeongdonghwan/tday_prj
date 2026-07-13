/** 브랜드 로고/심볼 (오늘연애). 심볼은 SVG, 워드마크는 RN Text(웹 폰트 미로드 시 SVG text 잘림 방지). */
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

// 심볼 단독 (하트 말풍선) — viewBox 36×34
const SYMBOL_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 34"><path d="M4,4 a4,4 0 0 0 -4,4 v14 a4,4 0 0 0 4,4 h5 l3,6 l5,-6 h15 a4,4 0 0 0 4,-4 v-14 a4,4 0 0 0 -4,-4 z" fill="#F23B5F"/><path d="M18,22.5 Q9.5,17 9.5,11.8 Q9.5,7.8 13.2,7.8 Q16,7.8 18,10.6 Q20,7.8 22.8,7.8 Q26.5,7.8 26.5,11.8 Q26.5,17 18,22.5 Z" fill="#FFF2F0"/></svg>`;

const SYMBOL_RATIO = 36 / 34;

/** 가로 로고 = 심볼 + "오늘연애" 워드마크(RN Text). height 기준 (기본 22). */
export function BrandLogo({ height = 22 }: { height?: number }) {
  return (
    <View style={[styles.row, { gap: height * 0.28 }]}>
      <SvgXml xml={SYMBOL_XML} width={height * SYMBOL_RATIO} height={height} />
      <Text style={[styles.word, { fontSize: height * 0.82, lineHeight: height }]}>오늘연애</Text>
    </View>
  );
}

/** 심볼 단독 (파비콘·빈 상태). */
export function BrandSymbol({ size = 28 }: { size?: number }) {
  return <SvgXml xml={SYMBOL_XML} width={size * SYMBOL_RATIO} height={size} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  word: { fontWeight: '800', color: '#1A1B1E', letterSpacing: -0.5, includeFontPadding: false },
});

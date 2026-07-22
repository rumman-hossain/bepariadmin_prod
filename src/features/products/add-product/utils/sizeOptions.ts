import type { SizeConfig } from '../../types/registration';

export type SizeMode = 'LETTER' | 'NUMBER' | 'UNIQUE' | 'AUTO';
export type FootwearScale = 'UK' | 'EU' | 'US';

const EU_TO_UK: Record<string, Record<number, number>> = {
  GENTS: { 39: 6, 40: 6.5, 41: 7, 42: 7.5, 43: 8, 44: 8.5, 45: 9, 46: 9.5, 47: 10, 48: 10.5, 49: 11, 50: 12 },
  WOMEN: { 35: 3, 36: 3.5, 37: 4, 38: 5, 39: 6, 40: 6.5, 41: 7 },
  KIDS: { 26: 8, 27: 9, 28: 10, 29: 11, 30: 12, 31: 13, 32: 1, 33: 1.5, 34: 2 },
};

const UK_TO_US: Record<string, Record<number, number>> = {
  GENTS: { 6: 8, 6.5: 8.5, 7: 9, 7.5: 9.5, 8: 10, 8.5: 10.5, 9: 11, 9.5: 11.5, 10: 12, 10.5: 12.5, 11: 13, 11.5: 13.5, 12: 14 },
  WOMEN: { 3: 5, 3.5: 5.5, 4: 6, 4.5: 6.5, 5: 7, 5.5: 7.5, 6: 8, 6.5: 8.5, 7: 9 },
  KIDS: { 8: 9, 9: 10, 10: 11, 11: 12, 12: 13, 13: 1, 1: 2, 1.5: 2.5, 2: 3 },
};

const FALLBACK_LETTER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const FALLBACK_NUMBER = (() => {
  const a: string[] = [];
  for (let i = 28; i <= 48; i += 2) a.push(String(i));
  return a;
})();

function footwearSizes(sizeConfig: SizeConfig, fwScale: FootwearScale): string[] {
  if (sizeConfig.type !== 'FOOTWEAR' || !sizeConfig.range) return [];
  const profile = sizeConfig.profile || 'GENTS';
  const euMap = EU_TO_UK[profile] || EU_TO_UK.GENTS;
  const usMap = UK_TO_US[profile] || UK_TO_US.GENTS;
  const result: string[] = [];
  for (let eu = sizeConfig.range.start; eu <= sizeConfig.range.end; eu++) {
    const uk = euMap[eu];
    if (uk === undefined) continue;
    if (fwScale === 'UK') result.push(String(uk));
    else if (fwScale === 'US') {
      const us = usMap[uk];
      if (us !== undefined) result.push(String(us));
    } else result.push(String(eu));
  }
  return result;
}

export function getAvailableSizes(
  sizeConfig: SizeConfig | null,
  sizeMode: SizeMode,
  fwScale: FootwearScale,
): string[] {
  if (!sizeConfig) return [];

  if (sizeConfig.type === 'FOOTWEAR') {
    return footwearSizes(sizeConfig, fwScale);
  }

  if (sizeMode === 'AUTO') {
    if (sizeConfig.options?.length) return sizeConfig.options;
    if (sizeConfig.range) {
      const step = sizeConfig.range.step || 1;
      const arr: string[] = [];
      for (let i = sizeConfig.range.start; i <= sizeConfig.range.end; i += step) arr.push(String(i));
      return arr;
    }
    if (sizeConfig.type === 'UNIQUE') return ['Free Size'];
    return [];
  }

  if (sizeMode === 'LETTER') {
    if (sizeConfig.type === 'LETTER' && sizeConfig.options?.length) return sizeConfig.options;
    return FALLBACK_LETTER;
  }

  if (sizeMode === 'NUMBER') {
    if (sizeConfig.type === 'NUMBER' && sizeConfig.range) {
      const step = sizeConfig.range.step || 1;
      const arr: string[] = [];
      for (let i = sizeConfig.range.start; i <= sizeConfig.range.end; i += step) arr.push(String(i));
      return arr;
    }
    return FALLBACK_NUMBER;
  }

  if (sizeMode === 'UNIQUE') return ['Free Size'];
  return [];
}

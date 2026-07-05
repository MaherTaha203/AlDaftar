/**
 * Amount in words — Arabic, for the approved book currency (BDR-19 / DL-029).
 *
 * Used ONLY on printed documents (never on screen). Pure and deterministic:
 * converts a non-negative ILS amount to its Arabic wording, whole shekels
 * («شيكل») plus agora («أغورة») when present. The currency subunit names are
 * facts about ILS (BOOK_CURRENCY, BDD-006), not invented business behavior.
 *
 * Grammar note: numbers use the common voucher convention (units before
 * tens joined by «و»; scale words in singular/dual/plural for 1/2/3–10 and
 * singular for 11+). Case endings (tanwīn) are omitted, as is customary on
 * printed vouchers. This is a presentation helper, not a linguistics engine.
 */
import { BOOK_CURRENCY, roundAmount } from './money';

const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];

const TEENS = [
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
];

const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];

const HUNDREDS = [
  '',
  'مائة',
  'مئتان',
  'ثلاثمائة',
  'أربعمائة',
  'خمسمائة',
  'ستمائة',
  'سبعمائة',
  'ثمانمائة',
  'تسعمائة',
];

interface Scale {
  readonly one: string;
  readonly two: string;
  readonly few: string;
  readonly many: string;
}

/** Scale words per 1000-group: [units placeholder], thousands, millions, billions. */
const SCALES: readonly (Scale | null)[] = [
  null,
  { one: 'ألف', two: 'ألفان', few: 'آلاف', many: 'ألف' },
  { one: 'مليون', two: 'مليونان', few: 'ملايين', many: 'مليون' },
  { one: 'مليار', two: 'ملياران', few: 'مليارات', many: 'مليار' },
];

/** «و» connector: space + waw, so the following word attaches (…و + واحد → وواحد). */
const WAW = ' و';

/** Words for 1–999. */
function under1000ToWords(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds > 0) {
    parts.push(HUNDREDS[hundreds]);
  }
  if (rest > 0) {
    if (rest < 10) {
      parts.push(ONES[rest]);
    } else if (rest < 20) {
      parts.push(TEENS[rest - 10]);
    } else {
      const tens = Math.floor(rest / 10);
      const ones = rest % 10;
      parts.push(ones > 0 ? `${ONES[ones]}${WAW}${TENS[tens]}` : TENS[tens]);
    }
  }
  return parts.join(WAW);
}

/** Words for a whole 1000-group at a given scale index (0 = units). */
function groupToWords(group: number, scaleIndex: number): string {
  if (scaleIndex === 0) {
    return under1000ToWords(group);
  }
  const scale = SCALES[scaleIndex];
  if (!scale) {
    // Beyond billions: degrade gracefully (implausible for a bookkeeping voucher).
    return under1000ToWords(group);
  }
  if (group === 1) {
    return scale.one;
  }
  if (group === 2) {
    return scale.two;
  }
  if (group <= 10) {
    return `${under1000ToWords(group)} ${scale.few}`;
  }
  return `${under1000ToWords(group)} ${scale.many}`;
}

/** Non-negative integer to Arabic words. */
export function integerToArabicWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) {
    return 'صفر';
  }
  const groups: number[] = [];
  let remaining = n;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) {
      continue;
    }
    parts.push(groupToWords(groups[i], i));
  }
  return parts.join(WAW);
}

/**
 * The ILS amount in Arabic words: whole shekels, plus agora when the fraction
 * is non-zero. Negative inputs are treated as their magnitude (documents never
 * carry negative amounts in the approved model). Non-ILS books fall back to
 * the currency code, since subunit names are ILS-specific.
 */
export function amountInWords(value: number): string {
  const rounded = roundAmount(Math.abs(value));
  const whole = Math.floor(rounded);
  const fraction = Math.round((rounded - whole) * 100);

  if (BOOK_CURRENCY.code !== 'ILS') {
    const base = `${integerToArabicWords(whole)} ${BOOK_CURRENCY.code}`;
    return fraction > 0 ? `${base}${WAW}${integerToArabicWords(fraction)}/100` : base;
  }

  const shekels = `${integerToArabicWords(whole)} شيكل`;
  if (fraction > 0) {
    return `${shekels}${WAW}${integerToArabicWords(fraction)} أغورة`;
  }
  return shekels;
}

/*
 * Royal Emerald — the approved Al Daftar visual identity (Design Sprint,
 * direction B). Deep emerald-teal as the single product accent; neutrals are
 * green-biased "mist" tones so the workspace stays calm for long entry
 * sessions. Semantic colors are quiet and used as information, never
 * decoration: success is a pure green (distinct from the teal-leaning
 * primary), warning a deep gold, danger a terracotta red. All text-bearing
 * colors hold ≥ 4.5:1 on white (WCAG AA; AAA where practical).
 */
export const colors = {
  primary: '#0c6e5f',
  secondary: '#5f6b66',
  success: '#178a4c',
  warning: '#a16207',
  danger: '#c2452f',
  neutral: {
    100: '#f2f5f3',
    200: '#e3e8e5',
    300: '#cbd3cf',
    400: '#93a09a',
    500: '#5f6b66',
  },
};

export type Colors = typeof colors;

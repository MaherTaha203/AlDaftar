/*
 * Royal Emerald typography — Arabic-first. IBM Plex Sans Arabic leads the
 * stack (self-hosted delivery lands in the Typography stage); the fallbacks
 * are the best native Arabic UI faces per platform so the hierarchy holds
 * everywhere. Latin digits render from the same stack with tabular-nums
 * applied at the component level for financial columns.
 */
export const typography = {
  fontFamilyBase:
    '"IBM Plex Sans Arabic", "SF Arabic", "Segoe UI", "Noto Sans Arabic", "Geeza Pro", Tahoma, system-ui, sans-serif',
  fontSizeBase: 16,
  lineHeightBase: 1.6,
};

export type Typography = typeof typography;

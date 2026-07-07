/*
 * Royal Emerald elevation — soft, ink-of-the-palette shadows (green-black
 * base instead of pure black) so lifted surfaces feel lit, not outlined.
 * Three steps only: sm for inputs/rows, md for cards/popovers, lg for
 * dialogs and floating panels.
 */
export const shadows = {
  sm: '0 1px 2px rgba(16, 33, 27, 0.06)',
  md: '0 4px 12px rgba(16, 33, 27, 0.08)',
  lg: '0 12px 28px rgba(16, 33, 27, 0.14)',
};

export type Shadows = typeof shadows;

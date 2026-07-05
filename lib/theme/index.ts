import { colors, type Colors } from './colors';
import { typography, type Typography } from './typography';
import { spacing, type Spacing } from './spacing';
import { breakpoints, type Breakpoints } from './breakpoints';
import { radius, type Radius } from './radius';
import { shadows, type Shadows } from './shadows';

/**
 * Design foundation — single canonical source of truth.
 *
 * These token modules are the authoritative definition of the project's design
 * primitives (colors, typography, spacing, radius, shadows, breakpoints). They
 * are projected into the styling system via the Tailwind `@theme` block in
 * `styles/globals.css`, whose values are kept identical to the tokens below.
 * See docs/decision-log.md (DL-006) for the source-of-truth contract.
 */

export { colors, typography, spacing, breakpoints, radius, shadows };
export type { Colors, Typography, Spacing, Breakpoints, Radius, Shadows };

export const theme = {
  colors,
  typography,
  spacing,
  breakpoints,
  radius,
  shadows,
} as const;

export type Theme = typeof theme;

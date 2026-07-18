/**
 * BrandMark — the Al Daftar logo (approved identity, logo direction 1:
 * «الدال المنحوتة»). The letter د carved in negative space out of a solid
 * rounded tile — the same visual language as the shell architecture (a cast
 * solid with pieces carved from it) — plus the copper dot that ties the mark
 * to the identity's copper accent thread.
 *
 * One source of truth for every in-app placement (rail brand, login, future
 * spots). `app/icon.svg` mirrors this drawing with hard-coded colors (a
 * static favicon cannot read CSS tokens) — keep the two in sync.
 *
 * Variants:
 * - `emerald` (default): primary tile, white د — for light grounds.
 * - `inverse`: white tile, primary د — for the emerald rail.
 * Colors track the theme tokens via CSS vars, so DL-006 stays intact.
 */
export interface BrandMarkProps {
  variant?: 'emerald' | 'inverse';
  /** Rendered width/height in px. */
  size?: number;
  className?: string;
}

export function BrandMark({ variant = 'emerald', size = 36, className }: BrandMarkProps) {
  const inverse = variant === 'inverse';
  const tile = inverse ? '#ffffff' : 'var(--color-primary)';
  const dal = inverse ? 'var(--color-primary)' : '#ffffff';
  // The copper dot lightens on the emerald tile (contrast), stays full copper
  // on the white tile.
  const dot = inverse
    ? 'var(--color-copper)'
    : 'color-mix(in srgb, var(--color-copper) 70%, white)';
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect width="96" height="96" rx="24" fill={tile} />
      <path
        d="M34 30c14 0 24 8 24 20 0 6-3 11-8 14H27"
        fill="none"
        stroke={dal}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="66" cy="66" r="4.5" fill={dot} />
    </svg>
  );
}

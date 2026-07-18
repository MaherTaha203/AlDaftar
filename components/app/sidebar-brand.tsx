import { BrandMark } from './brand-mark';
import { APP_BRAND } from './navigation';

/**
 * SidebarBrand (Visual Identity #4/#5) — the product's identity mark at the
 * top of the emerald rail: the approved BrandMark («الدال المنحوتة», inverse
 * variant so the white tile pops on the emerald solid) + the «الدفتر»
 * wordmark with a quiet copper "Al Daftar" line (the copper accent that ties
 * the rail to the top bar's System Center). Collapse-aware — between lg and
 * xl the rail is icon-only, so only the mark shows. A hairline copper divider
 * closes the block.
 */
export function SidebarBrand() {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex items-center gap-sm max-xl:justify-center">
        <BrandMark variant="inverse" size={36} className="shrink-0 rounded-lg" />
        <span className="flex flex-col leading-tight max-xl:sr-only">
          <span className="text-base font-semibold text-white">{APP_BRAND}</span>
          <span
            dir="ltr"
            className="text-[10px] font-medium uppercase tracking-[0.22em] text-[color:color-mix(in_srgb,var(--color-copper)_45%,white)]"
          >
            Al&nbsp;Daftar
          </span>
        </span>
      </div>
      <span
        aria-hidden="true"
        className="h-px w-full bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--color-copper)_55%,transparent),transparent)] max-xl:hidden"
      />
    </div>
  );
}

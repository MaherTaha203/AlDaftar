import { APP_BRAND } from './navigation';

/**
 * SidebarBrand (Visual Identity #4/#5) — the product's identity mark at the top
 * of the emerald rail: a ledger glyph + the «الدفتر» wordmark with a quiet
 * copper "Al Daftar" line (the copper accent that ties the rail to the top
 * bar's System Center). Collapse-aware — between lg and xl the sidebar is
 * icon-only, so only the glyph shows; the wordmark returns in the mobile
 * drawer. A hairline copper divider closes the block.
 */
export function SidebarBrand() {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex items-center gap-sm max-xl:justify-center max-md:justify-start">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/12 text-white ring-1 ring-inset ring-white/15"
        >
          <svg
            viewBox="0 0 24 24"
            width={20}
            height={20}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 0 4 21.5z" />
            <path d="M4 5.5A2.5 2.5 0 0 0 6.5 8H19" />
            <path d="M9 12.5h6M9 15.5h4" />
          </svg>
        </span>
        <span className="flex flex-col leading-tight max-xl:sr-only max-md:not-sr-only">
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
        className="h-px w-full bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--color-copper)_55%,transparent),transparent)] max-xl:hidden max-md:block"
      />
    </div>
  );
}

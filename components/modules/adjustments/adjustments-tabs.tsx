'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../ui/cn';

/**
 * AdjustmentsTabs — the shared header of the «التسويات» section (BDD-011).
 * One rail item, two sibling lists; these tabs are plain links between them
 * so each list keeps its own flat route (breadcrumbs, deep links, search).
 */
const TABS = [
  { href: '/credit-notes', label: 'إشعارات دائنة للموردين' },
  { href: '/payment-refunds', label: 'سندات استرداد الدفعات' },
] as const;

export function AdjustmentsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="أقسام التسويات" className="flex gap-xs border-b border-neutral-200 pb-sm">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-lg px-md py-xs text-sm font-semibold transition-colors',
              active
                ? 'bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-primary'
                : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-500',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

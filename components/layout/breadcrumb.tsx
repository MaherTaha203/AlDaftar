import Link from 'next/link';
import { Fragment } from 'react';
import { cn } from '../ui/cn';

/**
 * Breadcrumb — 03_UI_Specification.md §2: `Module / Record` under the
 * header on every screen except the dashboard; each segment navigates, the
 * current (last) segment is unlinked. Document numbers render LTR-isolated
 * automatically by the browser's bidi algorithm via `dir="auto"` spans.
 */
export interface BreadcrumbItem {
  label: string;
  /** Omit on the current (last) item. */
  href?: string;
}

export interface BreadcrumbProps {
  items: readonly BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="مسار التنقل" className={cn('text-sm text-neutral-400', className)}>
      <ol className="flex flex-wrap items-center gap-xs">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? <li aria-hidden="true">/</li> : null}
              <li>
                {item.href !== undefined && !isLast ? (
                  <Link
                    href={item.href}
                    className="rounded-sm hover:text-neutral-500 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <span dir="auto">{item.label}</span>
                  </Link>
                ) : (
                  <span aria-current={isLast ? 'page' : undefined} className="text-neutral-500">
                    <span dir="auto">{item.label}</span>
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

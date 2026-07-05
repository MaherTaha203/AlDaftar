import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * StatCard — 04_Component_Library.md §3. Dashboard metric tile: label, big
 * value (MoneyDisplay or a count), optional icon and description. When
 * `href` is given the whole card is a link (dashboard tiles navigate to
 * their module, 02 §S-00). Business-blind: values arrive pre-computed.
 */
export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** Secondary line under the value (e.g. a period note). */
  description?: string;
  /** Navigation target; renders the card as a link when provided. */
  href?: string;
  className?: string;
}

export function StatCard({ label, value, icon, description, href, className }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-sm">
        <p className="text-sm text-neutral-500">{label}</p>
        {icon ? <span className="text-neutral-400">{icon}</span> : null}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {description !== undefined ? <p className="text-xs text-neutral-400">{description}</p> : null}
    </>
  );

  const surface =
    'flex flex-col gap-sm rounded-lg border border-neutral-200 bg-white p-lg shadow-sm';

  if (href !== undefined) {
    return (
      <Link
        href={href}
        className={cn(
          surface,
          'transition-colors hover:border-primary/40 hover:shadow-md',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          className,
        )}
      >
        {body}
      </Link>
    );
  }
  return <section className={cn(surface, className)}>{body}</section>;
}

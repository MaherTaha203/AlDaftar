import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * Card — 04_Component_Library.md §3 / 03_UI_Specification.md §3. Container
 * for detail headers, dashboard tiles, and report summaries. Composed of
 * optional title row (title + end-aligned actions), body, and footer.
 */
export interface CardProps {
  title?: ReactNode;
  /** Rendered at the inline end of the title row. */
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Card({ title, actions, footer, className, children }: CardProps) {
  return (
    <section className={cn('rounded-lg border border-neutral-200 bg-white shadow-sm', className)}>
      {title !== undefined || actions !== undefined ? (
        <header className="flex items-center justify-between gap-md border-b border-neutral-200 px-lg py-md">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions ? <div className="flex items-center gap-sm">{actions}</div> : null}
        </header>
      ) : null}
      <div className="p-lg">{children}</div>
      {footer ? (
        <footer className="border-t border-neutral-200 px-lg py-md">{footer}</footer>
      ) : null}
    </section>
  );
}

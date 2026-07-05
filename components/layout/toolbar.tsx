import type { ReactNode } from 'react';
import { cn } from '../ui/cn';

/**
 * Toolbar — 04_Component_Library.md §4: the standard list-screen toolbar.
 * Primary action at the inline start, search in the middle, secondary
 * actions (print/export/filter toggle) at the inline end. Wraps on narrow
 * widths per 03_UI_Specification.md §5. Slots only — no behavior.
 */
export interface ToolbarProps {
  /** Primary action slot (e.g. the create Button). */
  primary?: ReactNode;
  /** Search slot (SearchBox). */
  search?: ReactNode;
  /** End-aligned secondary actions. */
  actions?: ReactNode;
  className?: string;
}

export function Toolbar({ primary, search, actions, className }: ToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-md py-md', className)}>
      {primary ? <div className="flex items-center gap-sm">{primary}</div> : null}
      {search ? <div className="w-full max-w-[360px] max-md:max-w-full">{search}</div> : null}
      {actions ? <div className="ms-auto flex items-center gap-sm">{actions}</div> : null}
    </div>
  );
}

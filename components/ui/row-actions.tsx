'use client';

import type { ReactNode } from 'react';
import { cn } from './cn';
import { Menu } from './menu';
import { MoreVerticalIcon } from './icons';

/**
 * RowActions — per-row quick actions (Productivity Sprint #1). One declarative
 * action list, two presentations chosen by the pointer:
 *   • fine pointer (desktop): inline icon buttons, revealed on row hover or
 *     keyboard focus (`group/row` on the <tr>), so the resting table stays
 *     calm and uncluttered;
 *   • coarse pointer (touch): a single kebab that opens the same actions as an
 *     overflow menu, since hover does not exist.
 * The component is business-blind — each screen supplies the actions that are
 * real for that row (view / edit / print / archive …); nothing is fabricated.
 */
export interface RowAction {
  key: string;
  /** Short Arabic label — tooltip on desktop, menu row on touch. */
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface RowActionsProps {
  actions: readonly RowAction[];
  /** Accessible label for the touch overflow trigger. */
  menuLabel?: string;
}

export function RowActions({ actions, menuLabel = 'إجراءات' }: RowActionsProps) {
  if (actions.length === 0) {
    return null;
  }
  return (
    <>
      {/* Desktop: hover / focus-revealed inline icons. */}
      <span
        className={cn(
          'items-center justify-end gap-xs pointer-coarse:hidden',
          'flex opacity-0 transition-opacity duration-150',
          'group-hover/row:opacity-100 group-focus-within/row:opacity-100',
        )}
      >
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            aria-label={action.label}
            title={action.label}
            disabled={action.disabled}
            onClick={action.onSelect}
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-md transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              'disabled:pointer-events-none disabled:opacity-40',
              action.danger
                ? 'text-neutral-400 hover:bg-danger/[0.08] hover:text-danger'
                : 'text-neutral-400 hover:bg-neutral-100 hover:text-primary',
            )}
          >
            <span className="flex size-4 items-center justify-center">{action.icon}</span>
          </button>
        ))}
      </span>

      {/* Touch: overflow menu (hover is unavailable). */}
      <span className="hidden pointer-coarse:inline-flex">
        <Menu
          label={menuLabel}
          trigger={<MoreVerticalIcon />}
          items={actions.map((action) => ({
            key: action.key,
            label: action.label,
            icon: action.icon,
            onSelect: action.onSelect,
            danger: action.danger,
            disabled: action.disabled,
          }))}
        />
      </span>
    </>
  );
}

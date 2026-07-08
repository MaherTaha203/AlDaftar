'use client';

import type { ReactNode } from 'react';
import { Button, type ButtonVariant } from './button';
import { Menu } from './menu';
import { MoreVerticalIcon } from './icons';

/**
 * DocumentActionBar (Visual Identity #18) — one action bar for every document
 * detail page (purchase / return / payment / supplier). Primary actions render
 * inline as a consistent button family; secondary ones collapse into a single
 * «المزيد» overflow menu, so the header reads the same across document types.
 * Which actions appear — and whether a destructive one is enabled or shown
 * disabled-with-a-reason — is decided by the page from the document's state and
 * the approved accounting rules; this component only presents them uniformly.
 */
export interface DocumentAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Tooltip shown while disabled (e.g. why a posted document can't be deleted). */
  disabledReason?: string;
  /** Render inside the «المزيد» overflow menu instead of inline. */
  overflow?: boolean;
}

export function DocumentActionBar({ actions }: { actions: readonly DocumentAction[] }) {
  const inline = actions.filter((action) => !action.overflow);
  const overflow = actions.filter((action) => action.overflow);

  return (
    <div className="flex flex-wrap items-center gap-sm">
      {inline.map((action) => {
        const button = (
          <Button
            variant={action.variant ?? 'secondary'}
            size="sm"
            icon={action.icon}
            disabled={action.disabled}
            onClick={action.onSelect}
          >
            {action.label}
          </Button>
        );
        // A disabled button has pointer-events:none, so wrap it to keep the
        // explanatory tooltip reachable on hover.
        return action.disabled && action.disabledReason ? (
          <span key={action.key} title={action.disabledReason} className="inline-flex">
            {button}
          </span>
        ) : (
          <span key={action.key} className="inline-flex">
            {button}
          </span>
        );
      })}
      {overflow.length > 0 ? (
        <Menu
          label="المزيد"
          trigger={<MoreVerticalIcon />}
          items={overflow.map((action) => ({
            key: action.key,
            label: action.label,
            icon: action.icon,
            onSelect: action.onSelect,
            danger: action.variant === 'danger',
            disabled: action.disabled,
          }))}
        />
      ) : null}
    </div>
  );
}

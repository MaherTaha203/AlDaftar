'use client';

import type { ReactNode } from 'react';
import { Button } from './button';
import { Dialog } from './dialog';
import { uiText } from './ui-text';

/**
 * ConfirmDialog — 03_UI_Specification.md §9. The confirm button must name
 * the action («ترحيل», «حذف») — never a bare OK; that is why `confirmLabel`
 * is required. `danger` styles destructive confirmations. `busy` keeps the
 * dialog open and inert while the confirmed action runs.
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Body content — the summary the user is confirming. */
  children: ReactNode;
  /** Named action, e.g. «ترحيل» or «حذف». */
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = uiText.cancel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      dismissable={!busy}
      footer={
        <>
          <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-neutral-500">{children}</div>
    </Dialog>
  );
}

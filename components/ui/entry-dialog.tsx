'use client';

import { useId, type FormEvent, type ReactNode } from 'react';
import { Button } from './button';
import { Dialog, type DialogSize } from './dialog';
import { uiText } from './ui-text';

/**
 * EntryDialog — 04_Component_Library.md §4. Form-in-dialog scaffolding for
 * the D-05 / D-08 / D-09 entry dialogs: the body is a real `<form>`
 * (`noValidate` — validation is inline per 03 §8, never browser bubbles),
 * the footer holds the named submit action and cancel, and `busy` keeps the
 * dialog open and inert while the submission runs. Submission behavior
 * belongs to the caller via `onSubmit`.
 */
export interface EntryDialogProps {
  open: boolean;
  title: string;
  /** Named submit action, e.g. «حفظ» or «إضافة». */
  submitLabel: string;
  cancelLabel?: string;
  size?: Extract<DialogSize, 'sm' | 'md'>;
  busy?: boolean;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}

export function EntryDialog({
  open,
  title,
  submitLabel,
  cancelLabel = uiText.cancel,
  size = 'md',
  busy = false,
  onSubmit,
  onClose,
  children,
}: EntryDialogProps) {
  const formId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      dismissable={!busy}
      footer={
        <>
          <Button type="submit" form={formId} loading={busy}>
            {submitLabel}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            {cancelLabel}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-md">
        {children}
      </form>
    </Dialog>
  );
}

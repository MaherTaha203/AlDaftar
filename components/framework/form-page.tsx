'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent, ReactNode } from 'react';
import { PageLayout } from '../app';
import { useShortcut } from '../app/use-shortcut';
import { Button } from '../ui';
import { useDirtyGuard } from './use-dirty-guard';

/**
 * FormPage — the Business Framework create/edit-screen template (the
 * FormPage/FormFooter scaffolding of 04_Component_Library.md §4). A real
 * `<form noValidate>` (inline Arabic validation only, 03 §8) with the named
 * submit action and cancel in the footer, a failure banner slot for the
 * operation error, busy-inert submission, and the unsaved-changes guard
 * while dirty.
 *
 * Field state, validation, and submission belong to the module (via
 * `useOperation`); this template owns only the identical chrome and
 * behavior of every form screen.
 */
export interface FormPageProps {
  /** Page heading override; defaults to the route title. */
  title?: ReactNode;
  /** Human label of the record being edited (breadcrumb leaf). */
  leafLabel?: string;
  /** Named submit action, e.g. «حفظ». */
  submitLabel: string;
  cancelLabel?: string;
  /** Where cancel navigates; defaults to router.back(). */
  onCancel?: () => void;
  /** True while the save operation runs; form becomes inert. */
  busy?: boolean;
  /** Activates the unsaved-changes guard (D-03 at the browser boundary). */
  dirty?: boolean;
  /** Arabic operation-failure message shown as a banner above the form. */
  error?: string | null;
  onSubmit: () => void;
  children: ReactNode;
}

export function FormPage({
  title,
  leafLabel,
  submitLabel,
  cancelLabel = 'إلغاء',
  onCancel,
  busy = false,
  dirty = false,
  error = null,
  onSubmit,
  children,
}: FormPageProps) {
  const router = useRouter();
  useDirtyGuard(dirty && !busy);
  // Ctrl+S saves the current form (only while it's actionable).
  useShortcut('save', () => onSubmit(), !busy);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <PageLayout title={title} leafLabel={leafLabel}>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-md">
        {error !== null ? (
          <div
            role="alert"
            className="rounded-md border border-danger/30 bg-danger/5 px-md py-sm text-sm text-danger"
          >
            {error}
          </div>
        ) : null}
        <div className="flex flex-col gap-md rounded-lg border border-neutral-200 bg-white p-lg shadow-sm">
          {children}
        </div>
        <div className="flex items-center justify-start gap-sm border-t border-neutral-200 pt-md">
          <Button type="submit" loading={busy}>
            {submitLabel}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onCancel ?? (() => router.back())}>
            {cancelLabel}
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}

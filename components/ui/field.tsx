'use client';

import { cloneElement, isValidElement, useId, type ReactElement } from 'react';
import { cn } from './cn';
import { uiText } from './ui-text';

/**
 * Field — form-field scaffolding per 03_UI_Specification.md §3 (labels above
 * fields, required `*`) and §8 (inline Arabic validation message under the
 * field, danger color). Wires `id`/`htmlFor`, `aria-describedby`, and the
 * invalid flag onto its single child control (Input/Textarea/Select/
 * MoneyInput/QuantityInput).
 */
export interface FieldProps {
  label: string;
  required?: boolean;
  /** Validation message; presence renders the child invalid. */
  error?: string;
  /** Secondary hint under the control (hidden while an error shows). */
  hint?: string;
  className?: string;
  children: ReactElement<{
    id?: string;
    invalid?: boolean;
    'aria-required'?: boolean;
    'aria-describedby'?: string;
  }>;
}

export function Field({ label, required = false, error, hint, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        invalid: error !== undefined ? true : children.props.invalid,
        // Signal requiredness to assistive tech without the native `required`
        // attribute, so the browser's built-in bubbles never pre-empt the
        // inline Arabic validation messages (03 §8).
        'aria-required': required || children.props['aria-required'],
        'aria-describedby': error !== undefined || hint !== undefined ? messageId : undefined,
      })
    : children;

  return (
    <div className={cn('flex flex-col gap-xs', className)}>
      <label htmlFor={id} className="text-sm font-medium text-neutral-500">
        {label}
        {required ? (
          <span aria-hidden="true" className="ms-xs text-danger">
            {uiText.requiredMark}
          </span>
        ) : null}
      </label>
      {control}
      {error !== undefined ? (
        <p id={messageId} className="text-sm text-danger">
          {error}
        </p>
      ) : hint !== undefined ? (
        <p id={messageId} className="text-sm text-neutral-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

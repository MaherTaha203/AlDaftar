'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { Button, PlusIcon, Select } from '../ui';

/**
 * EntityPicker — 04_Component_Library.md §2, Business Framework foundation.
 * Master-data selection (supplier, product, category, unit, currency):
 * a native-Select-based picker (platform type-ahead; ADR-0001-simple for a
 * single-user, low-volume catalog) with the optional quick-create action
 * (D-08) beside it. Options arrive as plain descriptors — the picker knows
 * nothing about the entities.
 *
 * Upgrading to a searchable combobox later changes only this component's
 * internals; the API (options / value / onValueChange / quickCreate) holds.
 */
export interface EntityOption {
  id: string;
  label: string;
}

export interface EntityPickerProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'value' | 'onChange' | 'children'
> {
  options: readonly EntityOption[];
  /** Selected entity id; null when nothing selected. */
  value: string | null;
  onValueChange: (id: string | null) => void;
  placeholder?: string;
  invalid?: boolean;
  /** Renders the quick-create button (D-08); opens the caller's dialog. */
  quickCreate?: { label: string; onCreate: () => void };
}

export const EntityPicker = forwardRef<HTMLSelectElement, EntityPickerProps>(function EntityPicker(
  { options, value, onValueChange, placeholder = 'اختر…', invalid, quickCreate, ...props },
  ref,
) {
  return (
    <span className="flex w-full items-stretch gap-xs">
      <Select
        ref={ref}
        invalid={invalid}
        placeholder={placeholder}
        {...props}
        value={value ?? ''}
        onChange={(event) => onValueChange(event.target.value === '' ? null : event.target.value)}
        className="min-w-0 flex-1"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </Select>
      {quickCreate !== undefined ? (
        <Button
          variant="secondary"
          size="sm"
          aria-label={quickCreate.label}
          onClick={quickCreate.onCreate}
          disabled={props.disabled}
          className="h-10 shrink-0"
          icon={<PlusIcon />}
        />
      ) : null}
    </span>
  );
});

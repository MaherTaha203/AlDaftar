import { describe, expect, it } from 'vitest';
import { ValueObject } from '@/lib/domain/common/value-object';

interface FlatProps extends Record<string, unknown> {
  amount: number;
  label: string;
}

class Flat extends ValueObject<FlatProps> {
  constructor(props: FlatProps) {
    super(props);
  }

  get frozenProps(): Readonly<FlatProps> {
    return this.props;
  }
}

class OtherFlat extends ValueObject<FlatProps> {
  constructor(props: FlatProps) {
    super(props);
  }
}

interface DeepProps extends Record<string, unknown> {
  tags: string[];
  when: Date;
  meta: { level: number };
}

class Deep extends ValueObject<DeepProps> {
  constructor(props: DeepProps) {
    super(props);
  }
}

describe('ValueObject — immutability', () => {
  it('deep-freezes its props', () => {
    const value = new Flat({ amount: 1, label: 'x' });
    expect(Object.isFrozen(value.frozenProps)).toBe(true);
    expect(Object.isFrozen(value)).toBe(true);
  });
});

describe('ValueObject — structural equality', () => {
  it('is equal when props are structurally equal', () => {
    expect(new Flat({ amount: 1, label: 'x' }).equals(new Flat({ amount: 1, label: 'x' }))).toBe(
      true,
    );
  });

  it('is equal to itself by reference', () => {
    const value = new Flat({ amount: 1, label: 'x' });
    expect(value.equals(value)).toBe(true);
  });

  it('differs when any prop differs', () => {
    expect(new Flat({ amount: 1, label: 'x' }).equals(new Flat({ amount: 2, label: 'x' }))).toBe(
      false,
    );
  });

  it('differs across subclasses with equal props', () => {
    const flat = new Flat({ amount: 1, label: 'x' });
    const other = new OtherFlat({ amount: 1, label: 'x' });
    expect(flat.equals(other as unknown as Flat)).toBe(false);
  });

  it('is never equal to null or undefined', () => {
    expect(new Flat({ amount: 1, label: 'x' }).equals(null)).toBe(false);
    expect(new Flat({ amount: 1, label: 'x' }).equals(undefined)).toBe(false);
  });
});

describe('ValueObject — deep structural equality', () => {
  const base = (): DeepProps => ({
    tags: ['a', 'b'],
    when: new Date('2026-07-04'),
    meta: { level: 1 },
  });

  it('compares nested arrays, dates, and objects by value', () => {
    expect(new Deep(base()).equals(new Deep(base()))).toBe(true);
  });

  it('differs when a nested date differs', () => {
    const changed = { ...base(), when: new Date('2026-07-05') };
    expect(new Deep(base()).equals(new Deep(changed))).toBe(false);
  });

  it('differs when a nested array length differs', () => {
    const changed = { ...base(), tags: ['a'] };
    expect(new Deep(base()).equals(new Deep(changed))).toBe(false);
  });

  it('differs when a nested object value differs', () => {
    const changed = { ...base(), meta: { level: 2 } };
    expect(new Deep(base()).equals(new Deep(changed))).toBe(false);
  });
});

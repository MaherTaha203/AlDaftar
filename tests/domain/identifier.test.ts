import { describe, expect, it } from 'vitest';
import { Identifier } from '@/lib/domain/common/identifier';

class TestId extends Identifier<string> {
  constructor(value: string) {
    super(value);
  }
}

class OtherId extends Identifier<string> {
  constructor(value: string) {
    super(value);
  }
}

describe('Identifier', () => {
  it('wraps and freezes its value', () => {
    const id = new TestId('abc');
    expect(id.value).toBe('abc');
    expect(Object.isFrozen(id)).toBe(true);
  });

  it('is equal to the same subclass wrapping the same value', () => {
    expect(new TestId('abc').equals(new TestId('abc'))).toBe(true);
  });

  it('differs when the value differs', () => {
    expect(new TestId('abc').equals(new TestId('xyz'))).toBe(false);
  });

  it('differs across subclasses even with the same value', () => {
    expect(new TestId('abc').equals(new OtherId('abc') as unknown as TestId)).toBe(false);
  });

  it('is never equal to null or undefined', () => {
    expect(new TestId('abc').equals(null)).toBe(false);
    expect(new TestId('abc').equals(undefined)).toBe(false);
  });

  it('serializes to its primitive value', () => {
    const id = new TestId('abc');
    expect(id.toString()).toBe('abc');
    expect(id.toJSON()).toBe('abc');
    expect(JSON.stringify({ id })).toBe('{"id":"abc"}');
  });
});

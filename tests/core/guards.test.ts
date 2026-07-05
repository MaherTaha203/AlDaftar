import { describe, expect, it } from 'vitest';
import {
  isArray,
  isBoolean,
  isDate,
  isDefined,
  isFunction,
  isNonEmptyString,
  isNumber,
  isObject,
  isString,
} from '@/lib/core';

describe('guards — isDefined', () => {
  it('rejects null and undefined only', () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined('')).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined(null)).toBe(false);
    expect(isDefined(undefined)).toBe(false);
  });
});

describe('guards — primitives', () => {
  it('isString', () => {
    expect(isString('a')).toBe(true);
    expect(isString(1)).toBe(false);
  });

  it('isNumber accepts finite numbers only', () => {
    expect(isNumber(1.5)).toBe(true);
    expect(isNumber(NaN)).toBe(false);
    expect(isNumber(Infinity)).toBe(false);
    expect(isNumber('1')).toBe(false);
  });

  it('isBoolean', () => {
    expect(isBoolean(true)).toBe(true);
    expect(isBoolean(0)).toBe(false);
  });

  it('isFunction', () => {
    expect(isFunction(() => undefined)).toBe(true);
    expect(isFunction({})).toBe(false);
  });
});

describe('guards — objects and arrays', () => {
  it('isObject excludes null and arrays', () => {
    expect(isObject({ a: 1 })).toBe(true);
    expect(isObject(null)).toBe(false);
    expect(isObject([])).toBe(false);
  });

  it('isArray', () => {
    expect(isArray([1, 2])).toBe(true);
    expect(isArray({})).toBe(false);
  });
});

describe('guards — isDate', () => {
  it('accepts valid dates and rejects invalid ones', () => {
    expect(isDate(new Date('2026-07-04'))).toBe(true);
    expect(isDate(new Date('not-a-date'))).toBe(false);
    expect(isDate('2026-07-04')).toBe(false);
  });
});

describe('guards — isNonEmptyString', () => {
  it('rejects empty and whitespace-only strings', () => {
    expect(isNonEmptyString('x')).toBe(true);
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isNonEmptyString(1)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  AppError,
  ErrorFactory,
  combine,
  failure,
  flatMap,
  flatMapAsync,
  fromPromise,
  fromThrowable,
  isFailure,
  isSuccess,
  map,
  mapAsync,
  mapError,
  match,
  success,
  unwrapOr,
} from '@/lib/core';

describe('Result — constructors', () => {
  it('success carries the value and is immutable', () => {
    const result = success(42);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(42);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('failure carries the error and is immutable', () => {
    const error = { code: 'X' };
    const result = failure(error);
    expect(result.ok).toBe(false);
    expect(result.error).toBe(error);
    expect(Object.isFrozen(result)).toBe(true);
  });
});

describe('Result — guards', () => {
  it('isSuccess / isFailure narrow the union', () => {
    expect(isSuccess(success(1))).toBe(true);
    expect(isSuccess(failure('e'))).toBe(false);
    expect(isFailure(failure('e'))).toBe(true);
    expect(isFailure(success(1))).toBe(false);
  });
});

describe('Result — map / mapError', () => {
  it('map transforms a success value', () => {
    const result = map(success(2), (n) => n * 3);
    expect(result).toEqual(success(6));
  });

  it('map passes a failure through untouched', () => {
    const original = failure('boom');
    expect(map(original, (n: number) => n * 3)).toBe(original);
  });

  it('mapError transforms a failure', () => {
    const result = mapError(failure('boom'), (e) => `${e}!`);
    expect(result).toEqual(failure('boom!'));
  });

  it('mapError passes a success through untouched', () => {
    const original = success(5);
    expect(mapError(original, (e: string) => `${e}!`)).toBe(original);
  });
});

describe('Result — flatMap / match / unwrapOr', () => {
  it('flatMap chains a success and short-circuits a failure', () => {
    expect(flatMap(success(2), (n) => success(n + 1))).toEqual(success(3));
    const fail = failure('stop');
    expect(flatMap(fail, (n: number) => success(n + 1))).toBe(fail);
  });

  it('match collapses both branches', () => {
    const onSuccess = (n: number) => `ok:${n}`;
    const onFailure = (e: string) => `err:${e}`;
    expect(match(success(7), { onSuccess, onFailure })).toBe('ok:7');
    expect(match(failure('bad'), { onSuccess, onFailure })).toBe('err:bad');
  });

  it('unwrapOr returns the value or the fallback', () => {
    expect(unwrapOr(success(9), 0)).toBe(9);
    expect(unwrapOr(failure('e'), 0)).toBe(0);
  });
});

describe('Result — combine', () => {
  it('collects all success values', () => {
    expect(combine([success(1), success(2), success(3)])).toEqual(success([1, 2, 3]));
  });

  it('short-circuits on the first failure', () => {
    const fail = failure('second');
    const result = combine([success(1), fail, success(3)]);
    expect(result).toBe(fail);
  });

  it('an empty list is an empty success', () => {
    expect(combine([])).toEqual(success([]));
  });
});

describe('Result — fromThrowable', () => {
  it('captures a returned value as success', () => {
    expect(fromThrowable(() => 10)).toEqual(success(10));
  });

  it('routes a thrown error through the provided error mapper', () => {
    const sentinel = ErrorFactory.fromUnknown('mapped');
    const result = fromThrowable(
      () => {
        throw new Error('nope');
      },
      () => sentinel,
    );
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBe(sentinel);
    }
  });

  it('maps a thrown error to a structured AppError by default', () => {
    const result = fromThrowable(() => {
      throw new Error('nope');
    });
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(AppError.isAppError(result.error)).toBe(true);
    }
  });
});

describe('Result — async helpers', () => {
  it('fromPromise resolves to success', async () => {
    expect(await fromPromise(Promise.resolve(5))).toEqual(success(5));
  });

  it('fromPromise captures a rejection via the provided mapper', async () => {
    const sentinel = ErrorFactory.fromUnknown('mapped');
    const result = await fromPromise(Promise.reject(new Error('x')), () => sentinel);
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBe(sentinel);
    }
  });

  it('mapAsync awaits the transform on success and passes failures through', async () => {
    expect(await mapAsync(success(2), async (n) => n * 5)).toEqual(success(10));
    const fail = failure('e');
    expect(await mapAsync(fail, async (n: number) => n * 5)).toBe(fail);
  });

  it('flatMapAsync chains an async success and passes failures through', async () => {
    expect(await flatMapAsync(success(2), async (n) => success(n + 8))).toEqual(success(10));
    const fail = failure('e');
    expect(await flatMapAsync(fail, async (n: number) => success(n + 8))).toBe(fail);
  });
});

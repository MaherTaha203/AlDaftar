import { describe, expect, it } from 'vitest';
import { Entity } from '@/lib/domain/common/entity';
import { Identifier } from '@/lib/domain/common/identifier';

class ThingId extends Identifier<string> {
  constructor(value: string) {
    super(value);
  }
}

class Thing extends Entity<ThingId> {
  constructor(
    id: ThingId,
    readonly label: string,
  ) {
    super(id);
  }
}

class OtherThing extends Entity<ThingId> {
  constructor(id: ThingId) {
    super(id);
  }
}

describe('Entity — identity equality', () => {
  it('is equal when the same subclass carries the same id, regardless of state', () => {
    expect(new Thing(new ThingId('1'), 'a').equals(new Thing(new ThingId('1'), 'b'))).toBe(true);
  });

  it('is equal to itself by reference', () => {
    const thing = new Thing(new ThingId('1'), 'a');
    expect(thing.equals(thing)).toBe(true);
  });

  it('differs when the id differs', () => {
    expect(new Thing(new ThingId('1'), 'a').equals(new Thing(new ThingId('2'), 'a'))).toBe(false);
  });

  it('differs across subclasses with the same id', () => {
    const thing = new Thing(new ThingId('1'), 'a');
    const other = new OtherThing(new ThingId('1'));
    expect(thing.equals(other as unknown as Thing)).toBe(false);
  });

  it('is never equal to null or undefined', () => {
    expect(new Thing(new ThingId('1'), 'a').equals(null)).toBe(false);
    expect(new Thing(new ThingId('1'), 'a').equals(undefined)).toBe(false);
  });
});

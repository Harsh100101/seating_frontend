import { describe, expect, it } from 'vitest';
import { resolveFilterDisplayLabel } from './filterDisplayLabel';

describe('resolveFilterDisplayLabel', () => {
  const options = [{ id: 'unit-1', name: 'Unit 1' }];

  it('resolves IDs to business labels', () => {
    expect(resolveFilterDisplayLabel('unit-1', options, false)).toBe('Unit 1');
  });

  it('prefers contextual labels when a hierarchy option provides one', () => {
    expect(resolveFilterDisplayLabel('floor-1', [{
      id: 'floor-1',
      name: 'Ground Floor',
      displayName: 'Unit 2 → Santosh Bhavan → Ground Floor'
    }], false)).toBe('Unit 2 → Santosh Bhavan → Ground Floor');
  });

  it('does not expose raw Mongo ObjectIds while loading or when stale', () => {
    const id = '6ae5927f73d051edceh8f05';
    expect(resolveFilterDisplayLabel(id, options, true)).toBe('Loading…');
    expect(resolveFilterDisplayLabel(id, options, false)).toBe('Unavailable selection');
  });

  it('keeps a readable legacy text filter as a fallback', () => {
    expect(resolveFilterDisplayLabel('Office A', [], false, 'Office A')).toBe('Office A');
  });
});

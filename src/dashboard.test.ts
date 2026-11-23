import { describe, it } from 'vitest';
import assert from 'node:assert';
import { formatOccupancyRate } from './pages/DashboardPage';

describe('formatOccupancyRate defensive calculation', () => {
  it('handles percentage values on 0..100 scale correctly', () => {
    assert.strictEqual(formatOccupancyRate(75.5), '75.5%');
    assert.strictEqual(formatOccupancyRate(100), '100.0%');
    assert.strictEqual(formatOccupancyRate(1), '1.0%');
    assert.strictEqual(formatOccupancyRate(50.25), '50.3%');
  });

  it('preserves fractional percentage values without multiplying them', () => {
    assert.strictEqual(formatOccupancyRate(0.5), '0.5%');
    assert.strictEqual(formatOccupancyRate(0.123), '0.1%');
  });

  it('handles zero, negative, null, and undefined values defensively', () => {
    assert.strictEqual(formatOccupancyRate(0), '0.0%');
    assert.strictEqual(formatOccupancyRate(-5), '0.0%');
    assert.strictEqual(formatOccupancyRate(null), '0.0%');
    assert.strictEqual(formatOccupancyRate(undefined), '0.0%');
    assert.strictEqual(formatOccupancyRate(NaN), '0.0%');
  });
});

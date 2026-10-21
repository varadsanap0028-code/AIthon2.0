import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDelta, generateDateSequence } from '../../services/admin/adminAnalyticsService.js';

describe('Admin KPI Math & Date Utilities Unit Suite', () => {
  test('1. calculateDelta computes accurate percentage deltas with 1 decimal precision', () => {
    // Normal growth
    assert.strictEqual(calculateDelta(150, 100), 50);
    // Normal drop
    assert.strictEqual(calculateDelta(75, 100), -25);
    // Rounded decimal
    assert.strictEqual(calculateDelta(10, 3), 233.3);
    // No change
    assert.strictEqual(calculateDelta(100, 100), 0);
  });

  test('2. calculateDelta returns null when previous period is 0 (avoids divide-by-zero or NaN)', () => {
    assert.strictEqual(calculateDelta(50, 0), null);
    assert.strictEqual(calculateDelta(0, 0), null);
    assert.strictEqual(calculateDelta(10, null), null);
    assert.strictEqual(calculateDelta(10, undefined), null);
  });

  test('3. generateDateSequence produces contiguous sequence of ISO date strings without gaps', () => {
    const start = new Date('2026-10-01T12:00:00Z');
    const end = new Date('2026-10-07T18:00:00Z');

    const sequence = generateDateSequence(start, end);
    assert.strictEqual(sequence.length, 7);
    assert.strictEqual(sequence[0], '2026-10-01');
    assert.strictEqual(sequence[1], '2026-10-02');
    assert.strictEqual(sequence[6], '2026-10-07');
  });

  test('4. generateDateSequence handles single-day range correctly', () => {
    const single = new Date('2026-10-15T00:00:00Z');
    const sequence = generateDateSequence(single, single);
    assert.strictEqual(sequence.length, 1);
    assert.strictEqual(sequence[0], '2026-10-15');
  });
});

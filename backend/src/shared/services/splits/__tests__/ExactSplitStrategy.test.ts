import { describe, it, expect } from 'vitest';
import { ExactSplitStrategy } from '../ExactSplitStrategy';

const strategy = new ExactSplitStrategy();

describe('ExactSplitStrategy', () => {
  it('uses exact values as-is when sum matches total', () => {
    const result = strategy.compute(1000, [
      { userId: 'a', value: 600 },
      { userId: 'b', value: 400 },
    ]);
    expect(result[0].amount).toBe(600);
    expect(result[1].amount).toBe(400);
  });

  it('allows ±1 tolerance for rounding', () => {
    // 333 + 333 + 333 = 999, diff = 1 — should be allowed
    expect(() =>
      strategy.compute(1000, [
        { userId: 'a', value: 333 },
        { userId: 'b', value: 333 },
        { userId: 'c', value: 334 },
      ])
    ).not.toThrow();
  });

  it('throws when sum is off by more than 1', () => {
    expect(() =>
      strategy.compute(1000, [
        { userId: 'a', value: 400 },
        { userId: 'b', value: 400 },
      ])
    ).toThrow();
  });

  it('handles 1 person paying full amount', () => {
    const result = strategy.compute(750, [{ userId: 'solo', value: 750 }]);
    expect(result[0].amount).toBe(750);
  });

  it('throws when no participants', () => {
    expect(() => strategy.compute(100, [])).toThrow('At least one participant is required');
  });

  it('rounds fractional values', () => {
    const result = strategy.compute(100, [
      { userId: 'a', value: 33.7 },
      { userId: 'b', value: 66.3 },
    ]);
    expect(result[0].amount).toBe(34);
    expect(result[1].amount).toBe(66);
  });
});

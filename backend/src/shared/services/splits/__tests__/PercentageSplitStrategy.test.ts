import { describe, it, expect } from 'vitest';
import { PercentageSplitStrategy } from '../PercentageSplitStrategy';

const strategy = new PercentageSplitStrategy();

describe('PercentageSplitStrategy', () => {
  // ── Basic cases ────────────────────────────────────────────────────────────
  it('splits 50/50 correctly', () => {
    const result = strategy.compute(1000, [
      { userId: 'a', value: 50 },
      { userId: 'b', value: 50 },
    ]);
    expect(result[0].amount).toBe(500);
    expect(result[1].amount).toBe(500);
  });

  it('splits 60/40 correctly', () => {
    const result = strategy.compute(1000, [
      { userId: 'a', value: 60 },
      { userId: 'b', value: 40 },
    ]);
    expect(result[0].amount).toBe(600);
    expect(result[1].amount).toBe(400);
    expect(result[0].amount + result[1].amount).toBe(1000);
  });

  it('last participant absorbs rounding remainder — sum always equals total', () => {
    // 1000 * 33.33% = 333.3 → can lose cents; last participant corrects
    const result = strategy.compute(1000, [
      { userId: 'a', value: 33.33 },
      { userId: 'b', value: 33.33 },
      { userId: 'c', value: 33.34 },
    ]);
    const total = result.reduce((s, r) => s + r.amount, 0);
    expect(total).toBe(1000);
  });

  it('handles 100 people at 1% each — no drift', () => {
    const participants = Array.from({ length: 100 }, (_, i) => ({ userId: `u${i}`, value: 1 }));
    const result = strategy.compute(10000, participants);
    const total = result.reduce((s, r) => s + r.amount, 0);
    expect(total).toBe(10000);
  });

  it('100% to a single person', () => {
    const result = strategy.compute(500, [{ userId: 'a', value: 100 }]);
    expect(result[0].amount).toBe(500);
  });

  // ── Validation ─────────────────────────────────────────────────────────────
  it('throws when percentages do not sum to 100', () => {
    expect(() =>
      strategy.compute(1000, [
        { userId: 'a', value: 40 },
        { userId: 'b', value: 40 },
      ])
    ).toThrow('Percentages must sum to 100%');
  });

  it('throws when participants is empty', () => {
    expect(() => strategy.compute(1000, [])).toThrow('At least one participant is required');
  });

  it('throws when total amount is zero', () => {
    expect(() =>
      strategy.compute(0, [{ userId: 'a', value: 100 }])
    ).toThrow('Total amount must be positive');
  });

  it('throws when total amount is negative', () => {
    expect(() =>
      strategy.compute(-100, [{ userId: 'a', value: 100 }])
    ).toThrow('Total amount must be positive');
  });

  it('allows ±0.01 floating-point tolerance on percentage sum', () => {
    // 33.33 + 33.33 + 33.34 = 100.00 — should not throw
    expect(() =>
      strategy.compute(1000, [
        { userId: 'a', value: 33.33 },
        { userId: 'b', value: 33.33 },
        { userId: 'c', value: 33.34 },
      ])
    ).not.toThrow();
  });
});

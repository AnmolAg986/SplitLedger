import { describe, it, expect } from 'vitest';
import { EqualSplitStrategy } from '../EqualSplitStrategy';

const strategy = new EqualSplitStrategy();

describe('EqualSplitStrategy', () => {
  // ── Basic cases ────────────────────────────────────────────────────────────
  it('splits evenly among 2 people', () => {
    const result = strategy.compute(1000, [{ userId: 'a' }, { userId: 'b' }]);
    expect(result).toHaveLength(2);
    expect(result[0].amount).toBe(500);
    expect(result[1].amount).toBe(500);
  });

  it('splits evenly among 3 people — penny correction', () => {
    // 1000 / 3 = 333.33... → [334, 333, 333] (sum = 1000)
    const result = strategy.compute(1000, [
      { userId: 'a' }, { userId: 'b' }, { userId: 'c' },
    ]);
    expect(result).toHaveLength(3);
    const total = result.reduce((s, r) => s + r.amount, 0);
    expect(total).toBe(1000);
    expect(result[0].amount).toBe(334);
    expect(result[1].amount).toBe(333);
    expect(result[2].amount).toBe(333);
  });

  it('handles 1 person — full amount', () => {
    const result = strategy.compute(500, [{ userId: 'solo' }]);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(500);
  });

  it('handles 100 people — distributes remainder correctly', () => {
    // 1001 / 100 = 10 base, 1 remainder → first person gets 11
    const participants = Array.from({ length: 100 }, (_, i) => ({ userId: `u${i}` }));
    const result = strategy.compute(1001, participants);
    const total = result.reduce((s, r) => s + r.amount, 0);
    expect(total).toBe(1001);
    expect(result[0].amount).toBe(11);
    expect(result[1].amount).toBe(10);
  });

  it('handles odd amount with many participants', () => {
    const participants = Array.from({ length: 7 }, (_, i) => ({ userId: `u${i}` }));
    const result = strategy.compute(100, participants);
    const total = result.reduce((s, r) => s + r.amount, 0);
    expect(total).toBe(100);
  });

  // ── Validation ─────────────────────────────────────────────────────────────
  it('throws if participants is empty', () => {
    expect(() => strategy.compute(100, [])).toThrow('At least one participant is required');
  });

  it('throws if total amount is zero', () => {
    expect(() => strategy.compute(0, [{ userId: 'a' }])).toThrow('Total amount must be positive');
  });

  it('throws if total amount is negative', () => {
    expect(() => strategy.compute(-50, [{ userId: 'a' }])).toThrow('Total amount must be positive');
  });
});

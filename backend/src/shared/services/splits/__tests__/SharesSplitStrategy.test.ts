import { describe, it, expect } from 'vitest';
import { SharesSplitStrategy } from '../SharesSplitStrategy';

const strategy = new SharesSplitStrategy();

describe('SharesSplitStrategy', () => {
  // ── Basic cases ────────────────────────────────────────────────────────────
  it('splits equally when shares are equal', () => {
    const result = strategy.compute(1000, [
      { userId: 'a', value: 1 },
      { userId: 'b', value: 1 },
    ]);
    expect(result[0].amount).toBe(500);
    expect(result[1].amount).toBe(500);
    expect(result[0].amount + result[1].amount).toBe(1000);
  });

  it('splits proportionally based on shares', () => {
    const result = strategy.compute(1000, [
      { userId: 'a', value: 3 }, // 3/5 = 600
      { userId: 'b', value: 2 }, // 2/5 = 400
    ]);
    expect(result[0].amount).toBe(600);
    expect(result[1].amount).toBe(400);
    expect(result[0].amount + result[1].amount).toBe(1000);
  });

  it('defaults to 1 share if value is not provided', () => {
    const result = strategy.compute(1000, [
      { userId: 'a', value: 3 }, // 3/4 = 750
      { userId: 'b' },           // 1/4 = 250 (defaults to 1)
    ]);
    expect(result[0].amount).toBe(750);
    expect(result[1].amount).toBe(250);
  });

  it('handles penny correction — remainder goes to person with most shares', () => {
    // 1000 / 3 shares = 333.333... each. Total calculated = 333.33 * 3 = 999.99
    // Remainder 0.01 goes to first person with highest shares (they all have 1)
    const result = strategy.compute(1000, [
      { userId: 'a', value: 1 },
      { userId: 'b', value: 1 },
      { userId: 'c', value: 1 },
    ]);
    const total = result.reduce((s, r) => s + r.amount, 0);
    expect(total).toBe(1000);
    expect(result[0].amount).toBe(333.34); // gets the extra penny
    expect(result[1].amount).toBe(333.33);
    expect(result[2].amount).toBe(333.33);
  });

  it('handles zero shares', () => {
    const result = strategy.compute(1000, [
      { userId: 'a', value: 2 }, // 2/2 = 1000
      { userId: 'b', value: 0 }, // 0/2 = 0
    ]);
    expect(result[0].amount).toBe(1000);
    expect(result[1].amount).toBe(0);
  });

  // ── Validation ─────────────────────────────────────────────────────────────
  it('throws when total shares is zero or less', () => {
    expect(() =>
      strategy.compute(1000, [
        { userId: 'a', value: 0 },
        { userId: 'b', value: 0 },
      ])
    ).toThrow('Total shares must be greater than zero');
  });

  it('throws when any share is negative', () => {
    expect(() =>
      strategy.compute(1000, [
        { userId: 'a', value: -1 },
        { userId: 'b', value: 2 },
      ])
    ).toThrow('Shares cannot be negative');
  });

  it('throws when participants is empty', () => {
    expect(() => strategy.compute(1000, [])).toThrow('At least one participant is required');
  });

  it('throws when total amount is zero or negative', () => {
    expect(() =>
      strategy.compute(0, [{ userId: 'a', value: 1 }])
    ).toThrow('Total amount must be greater than zero');
    
    expect(() =>
      strategy.compute(-10, [{ userId: 'a', value: 1 }])
    ).toThrow('Total amount must be greater than zero');
  });
});

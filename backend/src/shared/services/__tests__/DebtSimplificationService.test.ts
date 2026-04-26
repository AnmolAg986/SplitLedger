import { describe, it, expect } from 'vitest';
import { DebtSimplificationService, Transaction } from '../../../shared/services/DebtSimplificationService';

describe('DebtSimplificationService', () => {
  it('simplifies a chain of debts (A -> B -> C to A -> C)', () => {
    const txs: Transaction[] = [
      { from: 'A', to: 'B', amount: 100 },
      { from: 'B', to: 'C', amount: 100 },
    ];
    const result = DebtSimplificationService.simplify(txs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ from: 'A', to: 'C', amount: 100 });
  });

  it('cancels out circular debts (A -> B -> C -> A to nothing)', () => {
    const txs: Transaction[] = [
      { from: 'A', to: 'B', amount: 100 },
      { from: 'B', to: 'C', amount: 100 },
      { from: 'C', to: 'A', amount: 100 },
    ];
    const result = DebtSimplificationService.simplify(txs);
    expect(result).toHaveLength(0); // All balances are 0
  });

  it('simplifies multiple debts from one person to multiple people', () => {
    const txs: Transaction[] = [
      { from: 'A', to: 'B', amount: 50 },
      { from: 'A', to: 'C', amount: 50 },
    ];
    const result = DebtSimplificationService.simplify(txs);
    // Already minimal, but order might change or be combined differently depending on greedy matching.
    // In this case, A owes B 50 and owes C 50.
    expect(result).toHaveLength(2);
    const totalOwedByA = result.filter(t => t.from === 'A').reduce((sum, t) => sum + t.amount, 0);
    expect(totalOwedByA).toBe(100);
    expect(result.some(t => t.to === 'B' && t.amount === 50)).toBe(true);
    expect(result.some(t => t.to === 'C' && t.amount === 50)).toBe(true);
  });

  it('simplifies multiple people owing one person', () => {
    const txs: Transaction[] = [
      { from: 'B', to: 'A', amount: 50 },
      { from: 'C', to: 'A', amount: 50 },
    ];
    const result = DebtSimplificationService.simplify(txs);
    expect(result).toHaveLength(2);
    const totalOwedToA = result.filter(t => t.to === 'A').reduce((sum, t) => sum + t.amount, 0);
    expect(totalOwedToA).toBe(100);
  });

  it('handles complex graphs with partial cancellations', () => {
    const txs: Transaction[] = [
      { from: 'A', to: 'B', amount: 100 },
      { from: 'B', to: 'C', amount: 50 },
      { from: 'C', to: 'A', amount: 20 },
    ];
    // Net balances:
    // A: -100 + 20 = -80 (A owes 80)
    // B: +100 - 50 = +50 (B is owed 50)
    // C: +50 - 20 = +30  (C is owed 30)
    // Debtors: A (80)
    // Creditors: B (50), C (30)
    const result = DebtSimplificationService.simplify(txs);
    expect(result).toHaveLength(2);
    
    const aToB = result.find(t => t.from === 'A' && t.to === 'B');
    const aToC = result.find(t => t.from === 'A' && t.to === 'C');
    
    // Greedy algorithm matches largest first (B is owed 50, C is owed 30)
    expect(aToB?.amount).toBe(50);
    expect(aToC?.amount).toBe(30);
  });

  it('returns empty array for empty input', () => {
    expect(DebtSimplificationService.simplify([])).toHaveLength(0);
  });

  it('ignores transactions with zero amount', () => {
    const txs: Transaction[] = [
      { from: 'A', to: 'B', amount: 0 },
    ];
    const result = DebtSimplificationService.simplify(txs);
    expect(result).toHaveLength(0);
  });

  it('handles fractional amounts correctly', () => {
    const txs: Transaction[] = [
      { from: 'A', to: 'B', amount: 33.33 },
      { from: 'B', to: 'C', amount: 33.33 },
    ];
    const result = DebtSimplificationService.simplify(txs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ from: 'A', to: 'C', amount: 33.33 });
  });
});

import { ISplitStrategy, SplitInput, SplitResult } from './ISplitStrategy';

/**
 * Equal split: every participant pays the same amount.
 *
 * Penny correction: uses integer division (Math.floor) then distributes
 * remainders one unit at a time to the first N participants.
 * This guarantees the sum equals totalAmount exactly — no floating-point drift.
 *
 * Example: ₹1000 among 3 → [334, 333, 333]  (sums to 1000 ✓)
 */
export class EqualSplitStrategy implements ISplitStrategy {
  readonly type = 'equal';

  validate(totalAmount: number, participants: SplitInput[]): void {
    if (participants.length === 0) throw new Error('At least one participant is required');
    if (totalAmount <= 0) throw new Error('Total amount must be positive');
  }

  compute(totalAmount: number, participants: SplitInput[]): SplitResult[] {
    this.validate(totalAmount, participants);
    const n = participants.length;
    const base = Math.floor(totalAmount / n);
    const remainder = totalAmount % n;

    return participants.map((p, i) => ({
      userId: p.userId,
      amount: base + (i < remainder ? 1 : 0),
    }));
  }
}

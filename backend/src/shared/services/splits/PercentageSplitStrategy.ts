import { ISplitStrategy, SplitInput, SplitResult } from './ISplitStrategy';

/**
 * Percentage split: each participant's share is a percentage of the total.
 * Percentages must sum to 100 (±0.01 tolerance for floating-point).
 *
 * Penny correction: the last participant absorbs any rounding remainder,
 * guaranteeing the sum equals totalAmount exactly.
 */
export class PercentageSplitStrategy implements ISplitStrategy {
  readonly type = 'percentage';

  validate(totalAmount: number, participants: SplitInput[]): void {
    if (participants.length === 0) throw new Error('At least one participant is required');
    if (totalAmount <= 0) throw new Error('Total amount must be positive');
    const sum = participants.reduce((acc, p) => acc + (p.value ?? 0), 0);
    if (Math.abs(sum - 100) > 0.01) {
      throw new Error(
        `Percentages must sum to 100% (got ${sum.toFixed(2)}%).`
      );
    }
  }

  compute(totalAmount: number, participants: SplitInput[]): SplitResult[] {
    this.validate(totalAmount, participants);
    let assigned = 0;

    return participants.map((p, i) => {
      const isLast = i === participants.length - 1;
      const amount = isLast
        ? totalAmount - assigned                              // absorb remainder
        : Math.round(totalAmount * ((p.value ?? 0) / 100)); // round to nearest unit
      assigned += amount;
      return { userId: p.userId, amount };
    });
  }
}

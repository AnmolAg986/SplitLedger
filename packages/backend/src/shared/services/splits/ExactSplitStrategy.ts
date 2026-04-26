import { ISplitStrategy, SplitInput, SplitResult } from './ISplitStrategy';

/**
 * Exact split: each participant's amount is specified explicitly by the user.
 * The sum of all values must equal totalAmount (tolerance: ±1 unit for rounding).
 */
export class ExactSplitStrategy implements ISplitStrategy {
  readonly type = 'exact';

  validate(totalAmount: number, participants: SplitInput[]): void {
    if (participants.length === 0) throw new Error('At least one participant is required');
    const sum = participants.reduce((acc, p) => acc + (p.value ?? 0), 0);
    if (Math.abs(sum - totalAmount) > 1) {
      throw new Error(
        `Exact split amounts sum to ${sum} but total is ${totalAmount}. ` +
        `Difference: ${Math.abs(sum - totalAmount)}.`
      );
    }
  }

  compute(totalAmount: number, participants: SplitInput[]): SplitResult[] {
    this.validate(totalAmount, participants);
    return participants.map(p => ({
      userId: p.userId,
      amount: Math.round(p.value ?? 0),
    }));
  }
}

/** One entry in the participants list passed to a strategy. */
export interface SplitInput {
  userId: string;
  /** For 'exact': the explicit amount this user owes.
   *  For 'percentage': the percentage (0–100) this user owes.
   *  For 'equal': unused.
   *  For 'shares': the weight/shares (integer or float). */
  value?: number;
}

/** The computed result for one participant. */
export interface SplitResult {
  userId: string;
  amount: number; // always an integer (paise / cents)
}

/**
 * ISplitStrategy — Open/Closed Principle.
 * Adding a new split mode = new class implementing this interface.
 * No existing code needs to change.
 */
export interface ISplitStrategy {
  readonly type: string;
  /**
   * Compute split amounts for all participants.
   * @param totalAmount Total expense amount in smallest currency unit (paise/cents).
   * @param participants Array of participants with optional value per mode.
   * @returns Array of { userId, amount } that sums exactly to totalAmount.
   */
  compute(totalAmount: number, participants: SplitInput[]): SplitResult[];
  /**
   * Validate inputs before computation.
   * @throws Error with a user-friendly message if invalid.
   */
  validate(totalAmount: number, participants: SplitInput[]): void;
}

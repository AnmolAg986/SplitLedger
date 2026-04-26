import { ISplitStrategy, SplitInput, SplitResult } from './ISplitStrategy';
import { AppError } from '../../errors/AppError';

export class SharesSplitStrategy implements ISplitStrategy {
  readonly type = 'shares';

  validate(totalAmount: number, participants: SplitInput[]): void {
    if (!participants || participants.length === 0) {
      throw new AppError(400, 'INVALID_SPLIT', 'At least one participant is required');
    }

    if (totalAmount <= 0) {
      throw new AppError(400, 'INVALID_SPLIT', 'Total amount must be greater than zero');
    }

    let totalShares = 0;
    for (const p of participants) {
      const share = p.value ?? 1; // Default to 1 share if not provided
      if (share < 0) {
        throw new AppError(400, 'INVALID_SPLIT', 'Shares cannot be negative');
      }
      totalShares += share;
    }

    if (totalShares <= 0) {
      throw new AppError(400, 'INVALID_SPLIT', 'Total shares must be greater than zero');
    }
  }

  compute(totalAmount: number, participants: SplitInput[]): SplitResult[] {
    this.validate(totalAmount, participants);

    const totalShares = participants.reduce((sum, p) => sum + (p.value ?? 1), 0);
    let calculatedTotal = 0;
    
    const results: SplitResult[] = participants.map(p => {
      const share = p.value ?? 1;
      // Calculate exact amount and round to 2 decimal places
      const exactAmount = (share / totalShares) * totalAmount;
      const roundedAmount = Math.round(exactAmount * 100) / 100;
      
      calculatedTotal += roundedAmount;

      return {
        userId: p.userId,
        amount: roundedAmount
      };
    });

    // Handle rounding errors (penny correction)
    // Add/subtract the difference to the person with the most shares,
    // or the first person if there's a tie
    const diff = Math.round((totalAmount - calculatedTotal) * 100) / 100;
    
    if (diff !== 0) {
      // Find the participant with the largest share
      let maxSharesIndex = 0;
      let maxShares = participants[0].value ?? 1;
      
      for (let i = 1; i < participants.length; i++) {
        const share = participants[i].value ?? 1;
        if (share > maxShares) {
          maxShares = share;
          maxSharesIndex = i;
        }
      }
      
      results[maxSharesIndex].amount = Math.round((results[maxSharesIndex].amount + diff) * 100) / 100;
    }

    return results;
  }
}

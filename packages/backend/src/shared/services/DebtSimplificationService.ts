
export interface Transaction {
  from: string;
  to: string;
  amount: number;
}

export class DebtSimplificationService {
  /**
   * Minimizes the number of transactions required to settle all debts.
   * Based on the standard algorithm for debt simplification.
   */
  static simplify(transactions: Transaction[]): Transaction[] {
    const balances: Record<string, number> = {};

    // 1. Calculate net balance for each person
    for (const tx of transactions) {
      balances[tx.from] = (balances[tx.from] || 0) - tx.amount;
      balances[tx.to] = (balances[tx.to] || 0) + tx.amount;
    }

    // 2. Separate into debtors and creditors
    const debtors = Object.entries(balances)
      .filter(([_, bal]) => bal < -0.01)
      .map(([id, bal]) => ({ id, balance: Math.abs(bal) }))
      .sort((a, b) => b.balance - a.balance);

    const creditors = Object.entries(balances)
      .filter(([_, bal]) => bal > 0.01)
      .map(([id, bal]) => ({ id, balance: bal }))
      .sort((a, b) => b.balance - a.balance);

    const result: Transaction[] = [];

    // 3. Match them greedily
    let d = 0;
    let c = 0;

    while (d < debtors.length && c < creditors.length) {
      const amount = Math.min(debtors[d].balance, creditors[c].balance);
      
      if (amount > 0.01) {
        result.push({
          from: debtors[d].id,
          to: creditors[c].id,
          amount: parseFloat(amount.toFixed(2))
        });
      }

      debtors[d].balance -= amount;
      creditors[c].balance -= amount;

      if (debtors[d].balance <= 0.01) d++;
      if (creditors[c].balance <= 0.01) c++;
    }

    return result;
  }
}

import { BudgetRepository } from '../../infrastructure/persistence/BudgetRepository';

export class BudgetService {
  static getPeriodDates(period: string, startsAt: string) {
    const start = new Date(startsAt);
    const end = new Date(start);
    if (period === 'monthly') {
      end.setMonth(end.getMonth() + 1);
    } else if (period === 'weekly') {
      end.setDate(end.getDate() + 7);
    } else if (period === 'yearly') {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1); // fallback
    }
    return { start: start.toISOString(), end: end.toISOString() };
  }

  static async createBudget(data: {
    userId: string;
    groupId?: string;
    category?: string;
    amount: number;
    period: string;
    startsAt: string;
  }) {
    return await BudgetRepository.createBudget(data);
  }

  static async getBudgetsWithProgress(userId: string, groupId?: string) {
    const budgets = groupId 
      ? await BudgetRepository.getGroupBudgets(groupId)
      : await BudgetRepository.getPersonalBudgets(userId);

    const result = [];
    for (const b of budgets) {
      // Find the current period start and end based on starts_at and period
      // For simplicity, we just use the current month if monthly, etc.
      // But strictly speaking, it rolls over every period.
      // A quick implementation: just find the latest period that covers today.
      const today = new Date();
      let currentStart = new Date(b.starts_at);
      let currentEnd = new Date(currentStart);
      
      // Fast forward to current period
      while (currentEnd < today) {
        currentStart = new Date(currentEnd);
        if (b.period === 'monthly') currentEnd.setMonth(currentEnd.getMonth() + 1);
        else if (b.period === 'weekly') currentEnd.setDate(currentEnd.getDate() + 7);
        else if (b.period === 'yearly') currentEnd.setFullYear(currentEnd.getFullYear() + 1);
        else currentEnd.setMonth(currentEnd.getMonth() + 1);
      }

      const spent = await BudgetRepository.getSpentAmount(
        userId, 
        b.group_id, 
        b.category, 
        currentStart.toISOString(), 
        currentEnd.toISOString()
      );

      result.push({
        ...b,
        spent,
        progress: Math.min(100, (spent / parseFloat(b.amount)) * 100),
        currentPeriodStart: currentStart.toISOString(),
        currentPeriodEnd: currentEnd.toISOString()
      });
    }

    return result;
  }

  static async deleteBudget(id: string, userId: string) {
    return await BudgetRepository.deleteBudget(id, userId);
  }
}

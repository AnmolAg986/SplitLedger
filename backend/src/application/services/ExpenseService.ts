import { ExpenseRepository, CreateExpenseInput } from '../../infrastructure/persistence/ExpenseRepository';
import { FriendRepository } from '../../infrastructure/persistence/FriendRepository';
import { UnreadRepository } from '../../infrastructure/persistence/UnreadRepository';
import { ioInstance } from '../../infrastructure/websocket/socketServer';
import { SplitStrategyFactory } from '../../shared/services/splits/SplitStrategyFactory';
import { SplitInput } from '../../shared/services/splits/ISplitStrategy';
import { AppError } from '../../shared/errors/AppError';

export interface CreateExpenseServiceInput {
  groupId?: string | null;
  paidBy: string;
  amount: number;
  currency: string;
  description: string;
  splitType: string;
  category?: string;
  dueDate?: string;
  createdBy: string;
  participants: SplitInput[];
}

export class ExpenseService {
  static async createExpense(input: CreateExpenseServiceInput) {
    // 1. Calculate splits using the Strategy Pattern
    const strategy = SplitStrategyFactory.getStrategy(input.splitType);
    
    let computedSplits;
    try {
      computedSplits = strategy.compute(input.amount, input.participants);
    } catch (err: any) {
      throw new AppError(400, 'INVALID_SPLIT', err.message);
    }

    const repoInput: CreateExpenseInput = {
      groupId: input.groupId,
      paidBy: input.paidBy,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      splitType: input.splitType,
      category: input.category,
      dueDate: input.dueDate,
      createdBy: input.createdBy,
      splits: computedSplits.map(s => ({ userId: s.userId, amount: s.amount }))
    };

    // 2. Persist to DB
    const expense = await ExpenseRepository.createExpense(repoInput);

    // 3. Side effects (streaks, unread badges, sockets)
    for (const split of computedSplits) {
      if (split.userId !== input.createdBy) {
        try {
          await FriendRepository.updateStreak(input.createdBy, split.userId);
          
          if (input.groupId) {
            await UnreadRepository.increment(split.userId, 'group', input.groupId, 'expenses');
          } else {
            await UnreadRepository.increment(split.userId, 'friend', input.createdBy, 'expenses');
          }

          if (ioInstance) {
            ioInstance.to(split.userId).emit('unread_update', {
              type: 'unread_update',
              entity_type: input.groupId ? 'group' : 'friend',
              entity_id: input.groupId || input.createdBy,
              section: 'expenses',
              delta: 1
            });
          }
        } catch {
          // Swallow non-critical side-effect errors for now
        }
      }
    }

    return expense;
  }

  static async updateExpense(expenseId: string, userId: string, updates: Partial<CreateExpenseServiceInput>) {
    // Determine the current state if not fully provided, so we can re-compute splits if needed
    // But ExpenseRepository.updateExpense handles partial updates.
    // If participants are provided, we must re-compute splits.
    let repoUpdates: any = { ...updates };
    
    if (updates.participants && updates.amount !== undefined && updates.splitType) {
      const strategy = SplitStrategyFactory.getStrategy(updates.splitType);
      try {
        const computedSplits = strategy.compute(updates.amount, updates.participants);
        repoUpdates.splits = computedSplits.map(s => ({ userId: s.userId, amount: s.amount }));
        delete repoUpdates.participants;
      } catch (err: any) {
        throw new AppError(400, 'INVALID_SPLIT', err.message);
      }
    } else if (updates.participants) {
      throw new AppError(400, 'INVALID_UPDATE', 'To update participants, amount and splitType must also be provided');
    }

    const updated = await ExpenseRepository.updateExpense(expenseId, userId, repoUpdates);
    if (!updated) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense not found or not authorized');

    return updated;
  }

  static async getExpense(expenseId: string) {
    const expense = await ExpenseRepository.getExpenseById(expenseId);
    if (!expense) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense not found');
    return expense;
  }

  static async deleteExpense(expenseId: string, userId: string) {
    const deleted = await ExpenseRepository.deleteExpense(expenseId, userId);
    if (!deleted) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense not found or not authorized');
    return true;
  }

  static async remindExpense(expenseId: string, userId: string) {
    const expense = await ExpenseRepository.getExpenseById(expenseId);
    if (!expense) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense not found');

    for (const split of expense.splits) {
      if (!split.is_paid && split.user_id !== expense.paid_by) {
        try {
          if (expense.group_id) {
            await UnreadRepository.increment(split.user_id, 'group', expense.group_id, 'payments');
          } else {
            await UnreadRepository.increment(split.user_id, 'friend', expense.paid_by, 'payments');
          }

          if (ioInstance) {
            ioInstance.to(split.user_id).emit('notification', {
              type: 'reminder',
              message: `Reminder to settle up: ${expense.description}`,
              expenseId: expenseId
            });
            
            ioInstance.to(split.user_id).emit('unread_update', {
              type: 'unread_update',
              entity_type: expense.group_id ? 'group' : 'friend',
              entity_id: expense.group_id || expense.paid_by,
              section: 'payments',
              delta: 1
            });
          }
        } catch {
          // Ignore
        }
      }
    }

    await ExpenseRepository.recordReminderSent(expenseId);
    return true;
  }
}

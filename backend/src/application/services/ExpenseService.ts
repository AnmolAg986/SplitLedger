import { ExpenseRepository, CreateExpenseInput } from '../../infrastructure/persistence/ExpenseRepository';
import { FriendRepository } from '../../infrastructure/persistence/FriendRepository';
import { UnreadRepository } from '../../infrastructure/persistence/UnreadRepository';
import { ioInstance } from '../../infrastructure/websocket/socketServer';
import { SplitStrategyFactory } from '../../shared/services/splits/SplitStrategyFactory';
import { SplitInput } from '../../shared/services/splits/ISplitStrategy';
import { AppError } from '../../shared/errors/AppError';
import { getExchangeRate } from '../../shared/services/CurrencyService';
import { pool } from '../../config/db';

import { NotificationService as NotificationSys } from './NotificationService';
import { GroupActivityRepository } from '../../infrastructure/persistence/GroupActivityRepository';

export interface CreateExpenseServiceInput {
  groupId?: string | null;
  paidBy: string;
  amount: number;
  currency: string;
  description: string;
  splitType: string;
  category?: string;
  subcategory?: string;
  dueDate?: string;
  createdBy: string;
  participants: SplitInput[];
  tags?: string[];
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

    // 2. Get exchange rate for multi-currency support
    let exchangeRate = 1.0;
    let baseAmount = input.amount;

    if (input.groupId) {
      try {
        // Get group's base_currency
        const groupRes = await pool.query(
          `SELECT base_currency FROM groups WHERE id = $1`,
          [input.groupId]
        );
        const groupBaseCurrency = groupRes.rows[0]?.base_currency || 'INR';
        
        if (groupBaseCurrency !== input.currency) {
          exchangeRate = await getExchangeRate(input.currency, groupBaseCurrency);
          baseAmount = Math.round(input.amount * exchangeRate * 100) / 100;
        }
      } catch (err) {
        // Non-blocking — fall back to 1:1 if rate lookup fails
        console.warn('[ExpenseService] Exchange rate lookup failed, defaulting to 1.0:', err);
      }
    }

    const repoInput: CreateExpenseInput = {
      groupId: input.groupId,
      paidBy: input.paidBy,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      splitType: input.splitType,
      category: input.category,
      subcategory: input.subcategory,
      dueDate: input.dueDate,
      createdBy: input.createdBy,
      exchangeRate,
      baseAmount,
      splits: computedSplits.map(s => {
        const participant = input.participants.find(p => p.userId === s.userId);
        return { 
          userId: s.userId, 
          amount: s.amount,
          shares: participant?.value // pass down shares/weight
        };
      }),
      tags: input.tags
    };

    // 3. Persist to DB
    const expense = await ExpenseRepository.createExpense(repoInput);

    // 3. Side effects (streaks, sockets, notifications)
    for (const split of computedSplits) {
      if (split.userId !== input.createdBy) {
        try {
          await FriendRepository.updateStreak(input.createdBy, split.userId);
          
          // Phase 5: Notification System integration
          await NotificationSys.notify(
            split.userId,
            'expense_added',
            'New Expense Added',
            `You were added to an expense: ${input.description}`,
            input.groupId ? 'group' : 'expense',
            input.groupId || expense.id
          );

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

    // Log group activity (non-blocking)
    if (input.groupId) {
      GroupActivityRepository.log(input.groupId, input.createdBy, 'expense_added', {
        expense_id: expense.id,
        description: input.description,
        amount: input.amount,
        currency: input.currency,
        subcategory: input.subcategory
      });
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
        repoUpdates.splits = computedSplits.map(s => {
          const participant = updates.participants!.find(p => p.userId === s.userId);
          return { 
            userId: s.userId, 
            amount: s.amount,
            shares: participant?.value 
          };
        });
        delete repoUpdates.participants;
      } catch (err: any) {
        throw new AppError(400, 'INVALID_SPLIT', err.message);
      }
    } else if (updates.participants) {
      throw new AppError(400, 'INVALID_UPDATE', 'To update participants, amount and splitType must also be provided');
    }

    const updated = await ExpenseRepository.updateExpense(expenseId, userId, repoUpdates);
    if (updated === 'LOCKED') throw new AppError(403, 'FORBIDDEN', 'Cannot edit a locked expense');
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
    if (deleted === 'LOCKED') throw new AppError(403, 'FORBIDDEN', 'Cannot delete a locked expense');
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

  static async lockGroupExpenses(groupId: string, beforeDate: Date, userId: string) {
    return await ExpenseRepository.lockGroupExpenses(groupId, beforeDate, userId);
  }
}

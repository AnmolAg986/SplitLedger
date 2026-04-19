import { Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { ExpenseRepository, CreateExpenseInput } from '../../persistence/ExpenseRepository';
import { FriendRepository } from '../../persistence/FriendRepository';
import { RecurringExpenseRepository } from '../../persistence/RecurringExpenseRepository';
import { ioInstance } from '../../websocket/socketServer';

export class ExpenseController {

  static async createExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { groupId, paidBy, amount, currency, description, splitType, category, dueDate, splits } = req.body;

      if (!amount || !description || !splits || splits.length === 0) {
        return res.status(400).json({ error: 'Amount, description, and splits are required' });
      }

      const input: CreateExpenseInput = {
        groupId: groupId || null,
        paidBy: paidBy || userId,
        amount,
        currency: currency || 'INR',
        description,
        splitType: splitType || 'equal',
        category,
        dueDate,
        createdBy: userId,
        splits
      };

      const expense = await ExpenseRepository.createExpense(input);

      // Update spending streaks for all split participants
      for (const split of splits) {
        if (split.userId !== userId) {
          try {
            await FriendRepository.updateStreak(userId, split.userId);
          } catch {
            // Streak update is non-critical
          }
        }
      }

      return res.status(201).json(expense);
    } catch (err) {
      console.error('[ExpenseController] createExpense error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const expense = await ExpenseRepository.getExpenseById(id);
      if (!expense) return res.status(404).json({ error: 'Expense not found' });

      return res.status(200).json(expense);
    } catch (err) {
      console.error('[ExpenseController] getExpense error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const deleted = await ExpenseRepository.deleteExpense(id, userId);
      if (!deleted) return res.status(404).json({ error: 'Expense not found or not authorized' });

      return res.status(200).json({ message: 'Expense deleted' });
    } catch (err) {
      console.error('[ExpenseController] deleteExpense error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const updates = req.body;

      const updated = await ExpenseRepository.updateExpense(id, userId, updates);
      if (!updated) return res.status(404).json({ error: 'Expense not found or not authorized' });

      return res.status(200).json(updated);
    } catch (err) {
      console.error('[ExpenseController] updateExpense error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async remindExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const expense = await ExpenseRepository.getExpenseById(id);
      if (!expense) return res.status(404).json({ error: 'Expense not found' });

      // Identify who owes money for this expense
      // Send socket notifications to the users who owe money
      for (const split of expense.splits) {
        if (!split.is_paid && split.user_id !== expense.paid_by) {
          if (ioInstance) {
            ioInstance.to(split.user_id).emit('notification', {
              type: 'reminder',
              message: `Reminder to settle up: ${expense.description}`,
              expenseId: id
            });
          }
        }
      }

      await ExpenseRepository.recordReminderSent(id);

      return res.status(200).json({ message: 'Reminders sent successfully' });
    } catch (err) {
      console.error('[ExpenseController] remindExpense error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createRecurringTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { groupId, template, frequency } = req.body;
      const next_run_at = new Date();
      
      const now = new Date();
      if (frequency === 'daily') next_run_at.setDate(now.getDate() + 1);
      else if (frequency === 'weekly') next_run_at.setDate(now.getDate() + 7);
      else if (frequency === 'monthly') next_run_at.setMonth(now.getMonth() + 1);
      else if (frequency === 'yearly') next_run_at.setFullYear(now.getFullYear() + 1);

      await RecurringExpenseRepository.createTemplate({
        group_id: groupId,
        template,
        frequency,
        next_run_at,
        is_active: true,
        created_by: userId
      });

      return res.status(201).json({ message: 'Recurring template created' });
    } catch (err) {
      console.error('[ExpenseController] createRecurring error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

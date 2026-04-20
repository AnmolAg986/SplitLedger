import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { ExpenseService, CreateExpenseServiceInput } from '../../../application/services/ExpenseService';
import { RecurringExpenseRepository } from '../../persistence/RecurringExpenseRepository';
import { AppError } from '../../../shared/errors/AppError';

export class ExpenseController {

  static async createExpense(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const { groupId, paidBy, amount, currency, description, splitType, category, dueDate, participants, splits } = req.body;

      if (!amount || !description) {
        throw new AppError(400, 'BAD_REQUEST', 'Amount and description are required');
      }
      
      // Support legacy splits format from frontend if participants is not provided
      const finalParticipants = participants || (splits ? splits.map((s: any) => ({
        userId: s.userId || s.user_id,
        value: s.value !== undefined ? s.value : s.amount
      })) : []);

      if (finalParticipants.length === 0) {
        throw new AppError(400, 'BAD_REQUEST', 'Participants are required');
      }

      const input: CreateExpenseServiceInput = {
        groupId: groupId || null,
        paidBy: paidBy || userId,
        amount: Number(amount),
        currency: currency || 'INR',
        description,
        splitType: splitType || 'equal',
        category,
        dueDate,
        createdBy: userId,
        participants: finalParticipants
      };

      const expense = await ExpenseService.createExpense(input);
      return res.status(201).json(expense);
    } catch (err) {
      next(err);
    }
  }

  static async getExpense(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const id = req.params.id as string;
      const expense = await ExpenseService.getExpense(id);

      return res.status(200).json(expense);
    } catch (err) {
      next(err);
    }
  }

  static async deleteExpense(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const id = req.params.id as string;
      await ExpenseService.deleteExpense(id, userId);

      return res.status(200).json({ message: 'Expense deleted' });
    } catch (err) {
      next(err);
    }
  }

  static async updateExpense(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const id = req.params.id as string;
      const updates = req.body;
      
      if (updates.splits && !updates.participants) {
         updates.participants = updates.splits.map((s: any) => ({
            userId: s.userId || s.user_id,
            value: s.value !== undefined ? s.value : s.amount
         }));
      }

      const updated = await ExpenseService.updateExpense(id, userId, updates);

      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async remindExpense(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const id = req.params.id as string;
      await ExpenseService.remindExpense(id, userId);

      return res.status(200).json({ message: 'Reminders sent successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async createRecurringTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

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
      next(err);
    }
  }
}

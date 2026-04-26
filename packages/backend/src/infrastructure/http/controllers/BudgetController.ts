import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { BudgetService } from '../../../application/services/BudgetService';
import { AppError } from '../../../shared/errors/AppError';

export class BudgetController {
  static async createBudget(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const { groupId, category, amount, period, startsAt } = req.body;
      if (!amount || !period || !startsAt) {
        throw new AppError(400, 'BAD_REQUEST', 'Missing required fields');
      }

      const budget = await BudgetService.createBudget({
        userId,
        groupId,
        category,
        amount,
        period,
        startsAt
      });

      return res.status(201).json(budget);
    } catch (err) {
      next(err);
    }
  }

  static async getPersonalBudgets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const budgets = await BudgetService.getBudgetsWithProgress(userId);
      return res.status(200).json(budgets);
    } catch (err) {
      next(err);
    }
  }

  static async getGroupBudgets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const groupId = req.params.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const budgets = await BudgetService.getBudgetsWithProgress(userId, groupId as string);
      return res.status(200).json(budgets);
    } catch (err) {
      next(err);
    }
  }

  static async deleteBudget(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const success = await BudgetService.deleteBudget(req.params.id as string, userId);
      if (!success) throw new AppError(404, 'NOT_FOUND', 'Budget not found or unauthorized');

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

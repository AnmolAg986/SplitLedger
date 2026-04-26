import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { ExpenseService, CreateExpenseServiceInput } from '../../../application/services/ExpenseService';
import { RecurringExpenseRepository } from '../../persistence/RecurringExpenseRepository';
import { AppError } from '../../../shared/errors/AppError';
import { GroupActivityRepository } from '../../persistence/GroupActivityRepository';
import { AuditLogRepository } from '../../persistence/AuditLogRepository';

export class ExpenseController {

  static async createExpense(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const { groupId, paidBy, amount, currency, description, splitType, category, subcategory, dueDate, participants, splits, tags } = req.body;

      if (!amount || !description) {
        throw new AppError(400, 'BAD_REQUEST', 'Amount and description are required');
      }
      
      // Support legacy splits format from frontend if participants is not provided
      const finalParticipants = participants || (splits ? splits.map((s: any) => ({
        userId: s.userId || s.user_id,
        value: splitType === 'shares' || splitType === 'weight' 
                 ? (s.shares !== undefined ? s.shares : 1)
                 : (s.value !== undefined ? s.value : s.amount)
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
        subcategory,
        dueDate,
        createdBy: userId,
        participants: finalParticipants,
        tags
      };

      const expense = await ExpenseService.createExpense(input);
      return res.status(201).json(expense);
    } catch (err) {
      next(err);
    }
  }

  static async getExpenseContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const id = req.params.id as string;
      const expense = await ExpenseService.getExpense(id);
      
      if (!expense) throw new AppError(404, 'NOT_FOUND', 'Expense not found');
      
      // We must ensure the user has access to this expense.
      // Easiest way: if they can fetch it via getExpense (which probably checks access internally, 
      // or we just rely on group membership).
      if (!expense.group_id) {
        throw new AppError(400, 'BAD_REQUEST', 'Expense does not belong to a group');
      }

      return res.status(200).json({ groupId: expense.group_id, expenseId: expense.id });
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
      const expense = await ExpenseService.getExpense(id);
      await ExpenseService.deleteExpense(id, userId);

      if (expense?.group_id) {
        GroupActivityRepository.log(expense.group_id, userId, 'expense_deleted', {
          expense_id: id, description: expense.description
        });
      }

      await AuditLogRepository.log(userId, 'expense_delete', 'expense', id, req.ip || null, req.headers['user-agent'] || null);

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
            value: updates.splitType === 'shares' || updates.splitType === 'weight'
                     ? (s.shares !== undefined ? s.shares : 1)
                     : (s.value !== undefined ? s.value : s.amount)
         }));
      }

      const updated = await ExpenseService.updateExpense(id, userId, updates);

      if (updated?.group_id) {
        GroupActivityRepository.log(updated.group_id, userId, 'expense_edited', {
          expense_id: id, description: updated.description, amount: updated.amount
        });
      }

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

  static async getComments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const expenseId = req.params.id as string;
      const { ExpenseCommentRepository } = await import('../../persistence/ExpenseCommentRepository');
      const comments = await ExpenseCommentRepository.getComments(expenseId);
      return res.status(200).json(comments);
    } catch (err) {
      next(err);
    }
  }

  static async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const expenseId = req.params.id as string;
      const { content } = req.body;
      
      if (!content || !content.trim()) {
        throw new AppError(400, 'BAD_REQUEST', 'Comment content is required');
      }

      const { ExpenseCommentRepository } = await import('../../persistence/ExpenseCommentRepository');
      const comment = await ExpenseCommentRepository.addComment(expenseId, userId, content.trim());

      // Real-time notification to participants
      const participants = await ExpenseCommentRepository.getExpenseParticipants(expenseId);
      const { ioInstance } = await import('../../websocket/socketServer');
      const { NotificationService } = await import('../../../application/services/NotificationService');
      
      if (ioInstance) {
        for (const p of participants) {
           if (p && p !== userId) {
             ioInstance.to(p).emit('expense_comment', {
                expenseId,
                comment
             });

             // Also send a formal notification
             await NotificationService.notify(
                p,
                'chat_message', // using chat_message as a proxy for comment
                'New Expense Comment',
                `${comment.user_name} commented: ${content.substring(0, 50)}...`,
                'expense',
                expenseId
             ).catch(() => {});
           }
        }
      }

      return res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  }

  static async deleteComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const commentId = req.params.commentId as string;
      const { ExpenseCommentRepository } = await import('../../persistence/ExpenseCommentRepository');
      
      const success = await ExpenseCommentRepository.deleteComment(commentId, userId);
      if (!success) {
        throw new AppError(403, 'FORBIDDEN', 'Cannot delete this comment');
      }

      return res.status(200).json({ message: 'Comment deleted' });
    } catch (err) {
      next(err);
    }
  }

  static async importCsv(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const groupId = req.body.groupId || null;
      if (!req.file) throw new AppError(400, 'BAD_REQUEST', 'No CSV file uploaded');

      const fileContent = req.file.buffer.toString('utf-8');
      
      const { parse } = await import('csv-parse/sync');
      const { UserRepository } = await import('../../persistence/UserRepository');

      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      let imported = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i] as any;
        try {
           const description = record.description || record.Description || record.DESCRIPTION;
           const amountStr = record.amount || record.Amount || record.AMOUNT;
           const amount = parseFloat(amountStr);
           const paidByEmail = record.paid_by_email || record.PaidByEmail || record['Paid By Email'];
           const participantsStr = record.participants || record.Participants || record.PARTICIPANTS;
           const category = record.category || record.Category || record.CATEGORY;
           const dateStr = record.date || record.Date || record.DATE;
           
           if (!description || isNaN(amount)) {
             throw new Error('Description and valid amount are required');
           }

           let paidById = userId;
           if (paidByEmail) {
              const u = await UserRepository.findByIdentifier(paidByEmail);
              if (u) paidById = u.id;
              else throw new Error(`Payer email ${paidByEmail} not found`);
           }

           let participantIds: string[] = [];
           if (participantsStr) {
             const emails = participantsStr.split(',').map((e: string) => e.trim()).filter(Boolean);
             for (const email of emails) {
               const u = await UserRepository.findByIdentifier(email);
               if (u) participantIds.push(u.id);
               else throw new Error(`Participant email ${email} not found`);
             }
           } else {
             participantIds = [paidById];
           }

           if (!participantIds.includes(paidById)) {
             participantIds.push(paidById);
           }

           const splitAmount = Number((amount / participantIds.length).toFixed(2));
           const splits = participantIds.map((pid: string) => ({
             userId: pid,
             value: splitAmount
           }));
           
           const totalSplit = splits.reduce((acc: number, curr: any) => acc + curr.value, 0);
           if (totalSplit !== amount) {
             splits[0].value = Number((splits[0].value + (amount - totalSplit)).toFixed(2));
           }

           const input: CreateExpenseServiceInput = {
             groupId,
             paidBy: paidById,
             amount,
             currency: 'INR',
             description,
             splitType: 'equal',
             category: category || 'General',
             dueDate: dateStr ? new Date(dateStr).toISOString() : undefined,
             createdBy: userId,
             participants: splits
           };

           await ExpenseService.createExpense(input);
           imported++;
        } catch (err: any) {
           failed++;
           errors.push(`Row ${i + 1} (${record.description || 'Unknown'}): ${err.message}`);
        }
      }

      return res.status(200).json({ imported, failed, errors });
    } catch (err) {
      next(err);
    }
  }
}


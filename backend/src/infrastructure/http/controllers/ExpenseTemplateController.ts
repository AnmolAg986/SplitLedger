import { Request, Response, NextFunction } from 'express';
import { pool } from '../../../config/db';
import { AppError } from '../../../shared/errors/AppError';

export class ExpenseTemplateController {
  static async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const creatorId = req.user?.id;
      if (!creatorId) throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated');

      const { groupId, name, description, amount, splitMode, category, participants } = req.body;

      const result = await pool.query(
        `INSERT INTO expense_templates (creator_id, group_id, name, description, amount, split_mode, category, participants)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [creatorId, groupId || null, name, description, amount, splitMode, category, JSON.stringify(participants)]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  static async getTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated');

      const { groupId } = req.query;

      let query = `
        SELECT t.*
        FROM expense_templates t
      `;
      const params: any[] = [];

      if (groupId) {
        query += ` WHERE t.group_id = $1`;
        params.push(groupId);
      } else {
        query += ` WHERE t.creator_id = $1 AND t.group_id IS NULL`;
        params.push(userId);
      }

      query += ` ORDER BY t.created_at DESC`;

      const result = await pool.query(query, params);
      res.status(200).json(result.rows);
    } catch (error) {
      next(error);
    }
  }

  static async deleteTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated');

      const { id } = req.params;

      const result = await pool.query(
        `DELETE FROM expense_templates 
         WHERE id = $1 AND creator_id = $2
         RETURNING *`,
        [id, userId]
      );

      if (result.rowCount === 0) {
        throw new AppError(404, 'NOT_FOUND', 'Template not found or you do not have permission to delete it');
      }

      res.status(200).json({ message: 'Template deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

import { pool } from '../../config/db';

export interface RecurringTemplate {
  group_id: string;
  template: any; // { description, amount, currency, category, paid_by, splits }
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_run_at: Date;
  is_active: boolean;
  created_by: string;
}

export class RecurringExpenseRepository {
  static async createTemplate(data: RecurringTemplate) {
    const res = await pool.query(
      `INSERT INTO recurring_expenses (group_id, template, frequency, next_run_at, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.group_id, JSON.stringify(data.template), data.frequency, data.next_run_at, data.is_active, data.created_by]
    );
    return res.rows[0];
  }

  static async getDueTemplates() {
    const res = await pool.query(
      `SELECT * FROM recurring_expenses WHERE is_active = true AND next_run_at <= now()`
    );
    return res.rows;
  }

  static async updateNextRun(id: string, nextRun: Date) {
    await pool.query(
      `UPDATE recurring_expenses SET next_run_at = $2 WHERE id = $1`,
      [id, nextRun]
    );
  }

  static async deactivateTemplate(id: string) {
    await pool.query(
      `UPDATE recurring_expenses SET is_active = false WHERE id = $1`
    );
  }

  static async getGroupTemplates(groupId: string) {
    const res = await pool.query(
      `SELECT * FROM recurring_expenses WHERE group_id = $1`,
      [groupId]
    );
    return res.rows;
  }
}

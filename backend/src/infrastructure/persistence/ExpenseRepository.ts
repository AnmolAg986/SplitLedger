import { pool } from '../../config/db';

export interface CreateExpenseInput {
  groupId?: string | null;
  paidBy: string;
  amount: number;
  currency: string;
  description: string;
  splitType: string;
  category?: string;
  dueDate?: string;
  createdBy: string;
  splits: { userId: string; amount: number }[];
}

export class ExpenseRepository {

  static async createExpense(input: CreateExpenseInput) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const expenseRes = await client.query(
        `INSERT INTO expenses (group_id, paid_by, amount, currency, base_amount, description, split_type, category, created_by, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          input.groupId || null,
          input.paidBy,
          input.amount,
          input.currency,
          input.amount, // base_amount = amount for same currency
          input.description,
          input.splitType,
          input.category || null,
          input.createdBy,
          input.dueDate || null
        ]
      );
      const expense = expenseRes.rows[0];

      // Insert splits
      for (const split of input.splits) {
        await client.query(
          `INSERT INTO expense_splits (expense_id, user_id, amount, currency)
           VALUES ($1, $2, $3, $4)`,
          [expense.id, split.userId, split.amount, input.currency]
        );
      }

      await client.query('COMMIT');
      return expense;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async getExpenseById(expenseId: string) {
    const expenseRes = await pool.query(
      `SELECT e.*, payer.display_name as paid_by_name
       FROM expenses e
       JOIN users payer ON e.paid_by = payer.id
       WHERE e.id = $1 AND e.deleted_at IS NULL`,
      [expenseId]
    );
    if (expenseRes.rows.length === 0) return null;

    const splitsRes = await pool.query(
      `SELECT es.*, u.display_name, u.email
       FROM expense_splits es
       JOIN users u ON es.user_id = u.id
       WHERE es.expense_id = $1`,
      [expenseId]
    );

    return {
      ...expenseRes.rows[0],
      splits: splitsRes.rows
    };
  }

  static async deleteExpense(expenseId: string, userId: string) {
    const res = await pool.query(
      `UPDATE expenses SET deleted_at = now()
       WHERE id = $1 AND (created_by = $2 OR paid_by = $2) AND deleted_at IS NULL
       RETURNING id`,
      [expenseId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  static async updateExpense(expenseId: string, userId: string, updates: Partial<CreateExpenseInput>) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const checkRes = await client.query(
        `SELECT id FROM expenses WHERE id = $1 AND (created_by = $2 OR paid_by = $2) AND deleted_at IS NULL`,
        [expenseId, userId]
      );
      if (checkRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const getRes = await client.query(`SELECT * FROM expenses WHERE id = $1`, [expenseId]);
      const current = getRes.rows[0];

      const amount = updates.amount ?? current.amount;
      const currency = updates.currency ?? current.currency;
      const description = updates.description ?? current.description;
      const splitType = updates.splitType ?? current.split_type;
      const category = updates.category !== undefined ? updates.category : current.category;
      const dueDate = updates.dueDate !== undefined ? updates.dueDate : current.due_date;

      const expRes = await client.query(
        `UPDATE expenses 
         SET amount = $1, currency = $2, base_amount = $1, description = $3, split_type = $4, category = $5, due_date = $6
         WHERE id = $7 RETURNING *`,
        [amount, currency, description, splitType, category || null, dueDate || null, expenseId]
      );

      if (updates.splits && updates.splits.length > 0) {
        await client.query(`DELETE FROM expense_splits WHERE expense_id = $1`, [expenseId]);
        for (const split of updates.splits) {
          await client.query(
            `INSERT INTO expense_splits (expense_id, user_id, amount, currency)
             VALUES ($1, $2, $3, $4)`,
            [expenseId, split.userId, split.amount, currency]
          );
        }
      }

      await client.query('COMMIT');
      return expRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async recordReminderSent(expenseId: string) {
    await pool.query(
      `UPDATE expenses SET last_reminder_sent_at = now() WHERE id = $1`,
      [expenseId]
    );
  }
}

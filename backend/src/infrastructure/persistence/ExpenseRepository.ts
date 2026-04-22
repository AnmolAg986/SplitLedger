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
  exchangeRate?: number;   // rate from expense currency to group base currency
  baseAmount?: number;     // amount converted to group base currency
  splits: { userId: string; amount: number; shares?: number }[];
  tags?: string[];
}

export class ExpenseRepository {

  static async createExpense(input: CreateExpenseInput) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const exchangeRate = input.exchangeRate ?? 1.0;
      const baseAmount = input.baseAmount ?? input.amount;

      const expenseRes = await client.query(
        `INSERT INTO expenses (group_id, paid_by, amount, currency, base_amount, exchange_rate, description, split_type, category, created_by, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          input.groupId || null,
          input.paidBy,
          input.amount,
          input.currency,
          baseAmount,
          exchangeRate,
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
          `INSERT INTO expense_splits (expense_id, user_id, amount, currency, shares)
           VALUES ($1, $2, $3, $4, $5)`,
          [expense.id, split.userId, split.amount, input.currency, split.shares || 1]
        );
      }

      if (input.tags && input.tags.length > 0) {
        for (const tag of input.tags) {
          await client.query(
            `INSERT INTO expense_tags (expense_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [expense.id, tag]
          );
        }
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

    const tagsRes = await pool.query(
      `SELECT tag FROM expense_tags WHERE expense_id = $1`,
      [expenseId]
    );

    return {
      ...expenseRes.rows[0],
      splits: splitsRes.rows,
      tags: tagsRes.rows.map(r => r.tag)
    };
  }

  static async deleteExpense(expenseId: string, userId: string) {
    const res = await pool.query(
      `UPDATE expenses SET deleted_at = now()
       WHERE id = $1 AND (created_by = $2 OR paid_by = $2) AND deleted_at IS NULL AND is_locked = false
       RETURNING id`,
      [expenseId, userId]
    );
    
    if ((res.rowCount ?? 0) === 0) {
      // Check if it failed because it was locked
      const checkRes = await pool.query(`SELECT is_locked FROM expenses WHERE id = $1`, [expenseId]);
      if (checkRes.rows[0]?.is_locked) {
        return 'LOCKED';
      }
      return false;
    }
    return true;
  }

  static async updateExpense(expenseId: string, userId: string, updates: Partial<CreateExpenseInput>) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const checkRes = await client.query(
        `SELECT id, is_locked FROM expenses WHERE id = $1 AND (created_by = $2 OR paid_by = $2) AND deleted_at IS NULL`,
        [expenseId, userId]
      );
      if (checkRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      if (checkRes.rows[0].is_locked) {
        await client.query('ROLLBACK');
        return 'LOCKED';
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
            `INSERT INTO expense_splits (expense_id, user_id, amount, currency, shares)
             VALUES ($1, $2, $3, $4, $5)`,
            [expenseId, split.userId, split.amount, currency, split.shares || 1]
          );
        }
      }

      if (updates.tags) {
        await client.query(`DELETE FROM expense_tags WHERE expense_id = $1`, [expenseId]);
        for (const tag of updates.tags) {
          await client.query(
            `INSERT INTO expense_tags (expense_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [expenseId, tag]
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

  static async recordFriendNudge(userId: string, friendId: string) {
    // Update last_reminder_sent_at for all expenses where userId paid and friendId owes
    await pool.query(
      `UPDATE expenses e
       SET last_reminder_sent_at = now()
       FROM expense_splits es
       WHERE e.id = es.expense_id
         AND e.paid_by = $1
         AND es.user_id = $2
         AND es.is_paid = false
         AND e.deleted_at IS NULL`,
      [userId, friendId]
    );
  }

  static async lockGroupExpenses(groupId: string, beforeDate: Date, lockedBy: string) {
    const res = await pool.query(
      `UPDATE expenses
       SET is_locked = true, locked_by = $1, locked_at = now()
       WHERE group_id = $2
         AND created_at < $3
         AND deleted_at IS NULL
         AND is_locked = false`,
      [lockedBy, groupId, beforeDate]
    );
    return res.rowCount ?? 0;
  }
}

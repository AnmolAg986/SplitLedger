import { pool } from '../../config/db';

export class SettlementRepository {

  static async createSettlement(fromUser: string, toUser: string, amount: number, currency: string, groupId?: string | null, paymentMethod?: string, paymentRef?: string) {
    const res = await pool.query(
      `INSERT INTO settlements (group_id, from_user, to_user, amount, currency, status, payment_method, payment_ref)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
       RETURNING *`,
      [groupId || null, fromUser, toUser, amount, currency, paymentMethod || 'cash', paymentRef || null]
    );
    return res.rows[0];
  }

  static async createRecurring(
    fromUser: string, toUser: string, amount: number, currency: string,
    recurringInterval: string, nextDate: string,
    groupId?: string | null, paymentMethod?: string
  ) {
    const res = await pool.query(
      `INSERT INTO settlements
         (group_id, from_user, to_user, amount, currency, status,
          payment_method, is_recurring, recurring_interval, next_recurring_date)
       VALUES ($1,$2,$3,$4,$5,'pending',$6,true,$7,$8)
       RETURNING *`,
      [groupId || null, fromUser, toUser, amount, currency,
       paymentMethod || 'cash', recurringInterval, nextDate]
    );
    return res.rows[0];
  }

  static async markSettled(settlementId: string, userId: string) {
    const res = await pool.query(
      `UPDATE settlements
       SET status = 'completed', paid_at = now()
       WHERE id = $1 AND (from_user = $2 OR to_user = $2)
       RETURNING *`,
      [settlementId, userId]
    );
    return res.rows[0] || null;
  }

  static async disputeSettlement(settlementId: string, userId: string, note: string) {
    const res = await pool.query(
      `UPDATE settlements
       SET status = 'pending_confirmation', disputed_at = now(), dispute_note = $3
       WHERE id = $1 AND (from_user = $2 OR to_user = $2)
         AND created_at > now() - interval '48 hours'
       RETURNING *`,
      [settlementId, userId, note]
    );
    return res.rows[0] || null;
  }

  static async resolveDispute(settlementId: string, userId: string) {
    const res = await pool.query(
      `UPDATE settlements
       SET status = 'completed', disputed_at = null, dispute_note = null
       WHERE id = $1 AND (from_user = $2 OR to_user = $2)
       RETURNING *`,
      [settlementId, userId]
    );
    return res.rows[0] || null;
  }

  static async uploadProof(settlementId: string, userId: string, proofUrl: string) {
    const res = await pool.query(
      `UPDATE settlements
       SET proof_url = $3
       WHERE id = $1 AND (from_user = $2 OR to_user = $2)
       RETURNING *`,
      [settlementId, userId, proofUrl]
    );
    return res.rows[0] || null;
  }

  static async getSettlements(userId: string) {
    const res = await pool.query(
      `SELECT s.*,
              f.display_name as from_name,
              t.display_name as to_name
       FROM settlements s
       JOIN users f ON s.from_user = f.id
       JOIN users t ON s.to_user = t.id
       WHERE s.from_user = $1 OR s.to_user = $1
       ORDER BY s.created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  /** Mark all unpaid splits between two users as paid after settlement */
  static async settleUpBetween(fromUser: string, toUser: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Mark splits where fromUser owes toUser (toUser paid, fromUser is in split)
      await client.query(
        `UPDATE expense_splits es
         SET is_paid = true
         FROM expenses e
         WHERE es.expense_id = e.id
           AND e.paid_by = $2
           AND es.user_id = $1
           AND es.is_paid = false
           AND e.deleted_at IS NULL`,
        [fromUser, toUser]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async settleSpecificExpense(expenseId: string, userId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const expRes = await client.query(`SELECT paid_by FROM expenses WHERE id = $1`, [expenseId]);
      if (expRes.rows.length === 0) throw new Error('Expense not found');
      
      const paidBy = expRes.rows[0].paid_by;
      
      if (paidBy === userId) {
        await client.query(`UPDATE expense_splits SET is_paid = true WHERE expense_id = $1`, [expenseId]);
      } else {
        await client.query(`UPDATE expense_splits SET is_paid = true WHERE expense_id = $1 AND user_id = $2`, [expenseId, userId]);
      }
      
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async settleAllGroupMutual(groupId: string, userId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE expense_splits es
         SET is_paid = true
         FROM expenses e
         WHERE es.expense_id = e.id
           AND e.group_id = $1
           AND es.user_id = $2
           AND es.is_paid = false
           AND e.deleted_at IS NULL`,
        [groupId, userId]
      );
      
      await client.query(
        `UPDATE expense_splits es
         SET is_paid = true
         FROM expenses e
         WHERE es.expense_id = e.id
           AND e.group_id = $1
           AND e.paid_by = $2
           AND es.is_paid = false
           AND e.deleted_at IS NULL`,
        [groupId, userId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async addHistory(settlementId: string, action: string, actorId: string, note?: string) {
    const res = await pool.query(
      `INSERT INTO settlement_history (settlement_id, action, actor_id, note)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [settlementId, action, actorId, note || null]
    );
    return res.rows[0];
  }

  static async getHistory(settlementId: string) {
    const res = await pool.query(
      `SELECT h.*, u.display_name as actor_name
       FROM settlement_history h
       LEFT JOIN users u ON h.actor_id = u.id
       WHERE h.settlement_id = $1
       ORDER BY h.created_at DESC`,
      [settlementId]
    );
    return res.rows;
  }
}

import { pool } from '../../config/db';

export class ExpenseCommentRepository {
  static async getComments(expenseId: string) {
    const res = await pool.query(
      `SELECT c.*, u.display_name as user_name, u.avatar_url 
       FROM expense_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.expense_id = $1
       ORDER BY c.created_at ASC`,
      [expenseId]
    );
    return res.rows;
  }

  static async addComment(expenseId: string, userId: string, content: string) {
    const res = await pool.query(
      `INSERT INTO expense_comments (expense_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [expenseId, userId, content]
    );

    // Fetch the user details to return a complete comment object
    const userRes = await pool.query(`SELECT display_name as user_name, avatar_url FROM users WHERE id = $1`, [userId]);
    
    return {
      ...res.rows[0],
      ...userRes.rows[0]
    };
  }

  static async deleteComment(commentId: string, userId: string) {
    const res = await pool.query(
      `DELETE FROM expense_comments WHERE id = $1 AND user_id = $2 RETURNING id`,
      [commentId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  static async getExpenseParticipants(expenseId: string) {
    const res = await pool.query(
      `SELECT user_id FROM expense_splits WHERE expense_id = $1
       UNION
       SELECT paid_by FROM expenses WHERE id = $1
       UNION
       SELECT created_by FROM expenses WHERE id = $1`,
      [expenseId]
    );
    return res.rows.map(r => r.user_id || r.paid_by || r.created_by);
  }
}

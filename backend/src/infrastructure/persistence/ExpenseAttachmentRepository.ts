import { pool } from '../../config/db';

export class ExpenseAttachmentRepository {
  static async getAttachments(expenseId: string) {
    const res = await pool.query(
      `SELECT a.*, u.display_name as user_name
       FROM expense_attachments a
       JOIN users u ON a.user_id = u.id
       WHERE a.expense_id = $1
       ORDER BY a.created_at ASC`,
      [expenseId]
    );
    return res.rows;
  }

  static async addAttachment(expenseId: string, userId: string, fileUrl: string, fileName: string, fileType: string, fileSize: number) {
    const res = await pool.query(
      `INSERT INTO expense_attachments (expense_id, user_id, file_url, file_name, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [expenseId, userId, fileUrl, fileName, fileType, fileSize]
    );
    return res.rows[0];
  }

  static async deleteAttachment(attachmentId: string, userId: string) {
    // Return the file_url so the controller can delete the file from disk
    const res = await pool.query(
      `DELETE FROM expense_attachments WHERE id = $1 AND user_id = $2 RETURNING file_url`,
      [attachmentId, userId]
    );
    return res.rows[0] || null;
  }
}

import { pool } from '../../config/db';
import { ioInstance } from '../websocket/socketServer';

export function startReminderJob() {
  // Check every hour (3600000 ms)
  setInterval(async () => {
    try {
      // Find expenses that are not deleted
      // And due_date is within the next 24 hours
      // And no reminder has been sent in the last 24 hours
      const res = await pool.query(
        `SELECT e.id, e.description, e.due_date, es.user_id, u.display_name 
         FROM expenses e
         JOIN expense_splits es ON e.id = es.expense_id
         JOIN users u ON es.user_id = u.id
         WHERE e.deleted_at IS NULL
           AND e.due_date IS NOT NULL
           AND e.due_date > now() 
           AND (e.due_date <= now() + interval '24 hours' OR (LOWER(e.category) IN ('rent', 'subscription', 'house rent') AND e.due_date <= now() + interval '72 hours'))
           AND es.is_paid = false
           AND es.user_id != e.paid_by
           AND (e.last_reminder_sent_at IS NULL OR e.last_reminder_sent_at <= now() - interval '24 hours')`
      );

      const toRemind = res.rows;
      if (toRemind.length === 0) return;

      const expenseIdsToMark = new Set<string>();

      for (const record of toRemind) {
        if (ioInstance) {
          ioInstance.to(record.user_id).emit('notification', {
            type: 'reminder',
            message: `Auto-Reminder: ${record.description} is due on ${new Date(record.due_date).toLocaleDateString()}.`,
            expenseId: record.id
          });
        }
        expenseIdsToMark.add(record.id);
      }

      for (const eId of expenseIdsToMark) {
        await pool.query(`UPDATE expenses SET last_reminder_sent_at = now() WHERE id = $1`, [eId]);
      }

    } catch (err) {
      console.error('[ReminderJob] Error running reminder job:', err);
    }
  }, 1000 * 60 * 60);
}

import { pool } from '../../config/db';
import { SettlementRepository } from '../persistence/SettlementRepository';
import { NotificationService as NotificationSys } from '../../application/services/NotificationService';

export class RecurringSettlementJob {
  static async run() {
    console.log('[RecurringSettlementJob] Starting run...');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find all overdue recurring templates
      const res = await client.query(`
        SELECT * FROM settlements
        WHERE is_recurring = true
          AND next_recurring_date <= now()
      `);

      for (const st of res.rows) {
        // Create child settlement for this cycle
        const newSettlement = await SettlementRepository.createSettlement(
          st.from_user,
          st.to_user,
          parseFloat(st.amount),
          st.currency,
          st.group_id,
          st.payment_method,
          st.payment_ref
        );

        await SettlementRepository.addHistory(
          newSettlement.id,
          'created',
          st.from_user,
          `Auto-created by recurring schedule (${st.recurring_interval})`
        );

        // Advance the next run date
        const intervalMap: Record<string, string> = {
          weekly:  '1 week',
          monthly: '1 month',
          yearly:  '1 year',
        };
        const pgInterval = intervalMap[st.recurring_interval] ?? '1 month';

        await client.query(
          `UPDATE settlements
           SET next_recurring_date = next_recurring_date + $1::interval
           WHERE id = $2`,
          [pgInterval, st.id]
        );

        // Notify counterparty
        try {
          await NotificationSys.notify(
            st.to_user,
            'settled',
            'Recurring Payment',
            `A recurring settlement of ${st.amount} ${st.currency} has been auto-recorded.`,
            'settlement',
            newSettlement.id
          );
        } catch (e) {
          console.error('[RecurringSettlementJob] Notify error:', e);
        }

        console.log(`[RecurringSettlementJob] Processed ${st.id} → new ${newSettlement.id}`);
      }

      await client.query('COMMIT');
      console.log('[RecurringSettlementJob] Run complete.');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[RecurringSettlementJob] Error:', err);
    } finally {
      client.release();
    }
  }

  static start() {
    // Short initial delay so DB is ready
    setTimeout(() => this.run(), 5000);
    // Then daily
    setInterval(() => this.run(), 24 * 60 * 60 * 1000);
    console.log('[RecurringSettlementJob] Scheduled (daily).');
  }
}

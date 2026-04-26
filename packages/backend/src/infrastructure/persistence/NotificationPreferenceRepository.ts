import { pool } from '../../config/db';

export interface NotificationPreferences {
  userId: string;
  emailOnExpense: boolean;
  emailOnSettlement: boolean;
  emailOnNudge: boolean;
  pushOnExpense: boolean;
  pushOnChat: boolean;
  pushOnNudge: boolean;
  inAppAll: boolean;
}

export class NotificationPreferenceRepository {
  static async getPreferences(userId: string): Promise<NotificationPreferences> {
    const res = await pool.query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
    
    if (res.rows.length === 0) {
      // Default preferences if not row exists
      return {
        userId,
        emailOnExpense: true,
        emailOnSettlement: true,
        emailOnNudge: false,
        pushOnExpense: true,
        pushOnChat: true,
        pushOnNudge: true,
        inAppAll: true
      };
    }
    
    const r = res.rows[0];
    return {
      userId: r.user_id,
      emailOnExpense: r.email_on_expense,
      emailOnSettlement: r.email_on_settlement,
      emailOnNudge: r.email_on_nudge,
      pushOnExpense: r.push_on_expense,
      pushOnChat: r.push_on_chat,
      pushOnNudge: r.push_on_nudge,
      inAppAll: r.in_app_all
    };
  }

  static async updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<void> {
    // Upsert logic
    await pool.query(
      `INSERT INTO notification_preferences (
        user_id, email_on_expense, email_on_settlement, email_on_nudge, 
        push_on_expense, push_on_chat, push_on_nudge, in_app_all
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE SET
        email_on_expense = COALESCE(EXCLUDED.email_on_expense, notification_preferences.email_on_expense),
        email_on_settlement = COALESCE(EXCLUDED.email_on_settlement, notification_preferences.email_on_settlement),
        email_on_nudge = COALESCE(EXCLUDED.email_on_nudge, notification_preferences.email_on_nudge),
        push_on_expense = COALESCE(EXCLUDED.push_on_expense, notification_preferences.push_on_expense),
        push_on_chat = COALESCE(EXCLUDED.push_on_chat, notification_preferences.push_on_chat),
        push_on_nudge = COALESCE(EXCLUDED.push_on_nudge, notification_preferences.push_on_nudge),
        in_app_all = COALESCE(EXCLUDED.in_app_all, notification_preferences.in_app_all)`,
      [
        userId, 
        prefs.emailOnExpense, 
        prefs.emailOnSettlement, 
        prefs.emailOnNudge, 
        prefs.pushOnExpense, 
        prefs.pushOnChat, 
        prefs.pushOnNudge, 
        prefs.inAppAll
      ]
    );
  }
}

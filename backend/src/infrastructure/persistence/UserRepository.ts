import { pool } from '../../config/db';

export interface User {
  id: string;
  email?: string;
  phoneNumber?: string;
  displayName: string;
  passwordHash?: string;
  avatarUrl?: string;
  username?: string | null;
  defaultCurrency: string;
  upiId?: string;
  isVerified: boolean;
  loginCount: number;
  lastSeenAt?: Date | null;
  onboardingCompleted: boolean;
  totpSecret?: string | null;
  twoFaEnabled: boolean;
  privacyPolicyAgreedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UserRepository {
  static async findByIdentifier(identifier: string): Promise<User | null> {
    const isPhone = /^\+?\d+$/.test(identifier);
    const query = isPhone 
      ? 'SELECT * FROM users WHERE phone_number = $1' 
      : 'SELECT * FROM users WHERE email = $1 OR lower(username) = lower($1)';
      
    const res = await pool.query(query, [identifier]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      phoneNumber: row.phone_number,
      displayName: row.display_name,
      passwordHash: row.password_hash,
      avatarUrl: row.avatar_url,
      username: row.username,
      defaultCurrency: row.default_currency,
      upiId: row.upi_id,
      isVerified: row.is_verified,
      loginCount: row.login_count,
      lastSeenAt: row.last_seen_at,
      onboardingCompleted: row.onboarding_completed,
      totpSecret: row.totp_secret,
      twoFaEnabled: row.two_fa_enabled,
      privacyPolicyAgreedAt: row.privacy_policy_agreed_at,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async findById(id: string): Promise<User | null> {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      phoneNumber: row.phone_number,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      username: row.username,
      defaultCurrency: row.default_currency,
      upiId: row.upi_id,
      isVerified: row.is_verified,
      loginCount: row.login_count,
      lastSeenAt: row.last_seen_at,
      onboardingCompleted: row.onboarding_completed,
      totpSecret: row.totp_secret,
      twoFaEnabled: row.two_fa_enabled,
      privacyPolicyAgreedAt: row.privacy_policy_agreed_at,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async create(email: string | null, phoneNumber: string | null, displayName: string, passwordHash?: string, username?: string | null): Promise<User> {
    const res = await pool.query(
      `INSERT INTO users (email, phone_number, display_name, password_hash, username)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [email, phoneNumber, displayName, passwordHash, username || null]
    );
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      phoneNumber: row.phone_number,
      displayName: row.display_name,
      passwordHash: row.password_hash,
      avatarUrl: row.avatar_url,
      username: row.username,
      defaultCurrency: row.default_currency,
      upiId: row.upi_id,
      isVerified: row.is_verified,
      loginCount: row.login_count,
      onboardingCompleted: row.onboarding_completed,
      totpSecret: row.totp_secret,
      twoFaEnabled: row.two_fa_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async updatePassword(userId: string, newHash: string): Promise<void> {
    await pool.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [newHash, userId]);
  }

  static async incrementLoginCount(userId: string): Promise<void> {
    await pool.query('UPDATE users SET login_count = login_count + 1 WHERE id = $1', [userId]);
  }

  static async completeOnboarding(userId: string): Promise<void> {
    await pool.query('UPDATE users SET onboarding_completed = true WHERE id = $1', [userId]);
  }

  static async updateProfile(userId: string, displayName: string, avatarUrl: string | null, username: string | null): Promise<User | null> {
    const res = await pool.query(
      `UPDATE users SET display_name = $1, avatar_url = $2, username = $4, updated_at = now() WHERE id = $3 RETURNING *`,
      [displayName, avatarUrl, userId, username]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      phoneNumber: row.phone_number,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      username: row.username,
      defaultCurrency: row.default_currency,
      upiId: row.upi_id,
      isVerified: row.is_verified,
      loginCount: row.login_count,
      onboardingCompleted: row.onboarding_completed,
      totpSecret: row.totp_secret,
      twoFaEnabled: row.two_fa_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // --- OTP Verification Logic ---

  static async storeOTP(userId: string, code: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    await pool.query(
      `INSERT INTO verification_codes (user_id, code, expires_at) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, created_at = now()`,
      [userId, code, expiresAt]
    );
  }

  static async verifyOTP(userId: string, code: string): Promise<boolean> {
    const res = await pool.query(
      `SELECT * FROM verification_codes 
       WHERE user_id = $1 AND code = $2 AND expires_at > now()`,
      [userId, code]
    );

    if (res.rows.length > 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('UPDATE users SET is_verified = true WHERE id = $1', [userId]);
        await client.query('DELETE FROM verification_codes WHERE user_id = $1', [userId]);
        await client.query('COMMIT');
        return true;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
    return false;
  }

  static async checkOTP(userId: string, code: string): Promise<boolean> {
    const res = await pool.query(
      `SELECT 1 FROM verification_codes 
       WHERE user_id = $1 AND code = $2 AND expires_at > now()`,
      [userId, code]
    );
    return res.rows.length > 0;
  }

  static async verifyResetOTP(userId: string, code: string): Promise<boolean> {
    const res = await pool.query(
      `SELECT * FROM verification_codes 
       WHERE user_id = $1 AND code = $2 AND expires_at > now()`,
      [userId, code]
    );

    if (res.rows.length > 0) {
      await pool.query('DELETE FROM verification_codes WHERE user_id = $1', [userId]);
      return true;
    }
    return false;
  }

  static async updateLastSeen(userId: string, lastSeen: Date) {
    await pool.query(
      `UPDATE users SET last_seen_at = $1 WHERE id = $2`,
      [lastSeen, userId]
    );
  }

  // --- 2FA Methods ---
  static async enable2FA(userId: string, secret: string): Promise<void> {
    await pool.query(
      `UPDATE users SET totp_secret = $1, two_fa_enabled = true WHERE id = $2`,
      [secret, userId]
    );
  }

  static async disable2FA(userId: string): Promise<void> {
    await pool.query(
      `UPDATE users SET totp_secret = NULL, two_fa_enabled = false WHERE id = $1`,
      [userId]
    );
    await pool.query(
      `DELETE FROM two_fa_recovery_codes WHERE user_id = $1`,
      [userId]
    );
  }

  static async storeRecoveryCodes(userId: string, hashes: string[]): Promise<void> {
    if (hashes.length === 0) return;
    const values = hashes.map((_, i) => `($1, $${i + 2})`).join(', ');
    const params = [userId, ...hashes];
    await pool.query(
      `INSERT INTO two_fa_recovery_codes (user_id, code_hash) VALUES ${values}`,
      params
    );
  }

  static async verifyRecoveryCode(userId: string, hash: string): Promise<boolean> {
    const res = await pool.query(
      `SELECT * FROM two_fa_recovery_codes WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL`,
      [userId, hash]
    );
    if (res.rows.length > 0) {
      await pool.query(
        `UPDATE two_fa_recovery_codes SET used_at = now() WHERE user_id = $1 AND code_hash = $2`,
        [userId, hash]
      );
      return true;
    }
    return false;
  }

  // --- GDPR / Privacy ---

  static async recordPrivacyPolicyAgreement(userId: string): Promise<void> {
    await pool.query(
      `UPDATE users SET privacy_policy_agreed_at = now() WHERE id = $1`,
      [userId]
    );
  }

  static async softDeleteAccount(userId: string): Promise<void> {
    await pool.query(
      `UPDATE users SET deleted_at = now() WHERE id = $1`,
      [userId]
    );
    // Schedule hard deletion in 30 days
    const scheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO account_deletions (user_id, scheduled_at) VALUES ($1, $2)`,
      [userId, scheduledAt]
    );
  }

  static async cancelDeletion(userId: string): Promise<void> {
    await pool.query(
      `UPDATE users SET deleted_at = NULL WHERE id = $1`,
      [userId]
    );
    await pool.query(
      `UPDATE account_deletions SET cancelled_at = now() WHERE user_id = $1 AND executed_at IS NULL AND cancelled_at IS NULL`,
      [userId]
    );
  }

  static async exportData(userId: string): Promise<Record<string, unknown>> {
    const [user, expenses, messages, settlements, groups] = await Promise.all([
      pool.query(`SELECT id, email, phone_number, display_name, username, avatar_url, default_currency, created_at FROM users WHERE id = $1`, [userId]),
      pool.query(`SELECT * FROM expenses WHERE paid_by = $1 ORDER BY created_at DESC`, [userId]),
      pool.query(`SELECT * FROM messages WHERE sender_id = $1 ORDER BY created_at DESC`, [userId]),
      pool.query(`SELECT * FROM settlement_history WHERE payer_id = $1 OR payee_id = $1 ORDER BY settled_at DESC`, [userId]),
      pool.query(`SELECT g.* FROM groups g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = $1`, [userId]),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: user.rows[0] ?? null,
      expenses: expenses.rows,
      messages: messages.rows,
      settlements: settlements.rows,
      groups: groups.rows,
    };
  }
}

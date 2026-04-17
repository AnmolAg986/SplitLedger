import { pool } from '../../config/db';

export interface User {
  id: string;
  email?: string;
  phoneNumber?: string;
  displayName: string;
  passwordHash?: string;
  avatarUrl?: string;
  defaultCurrency: string;
  upiId?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserRepository {
  static async findByIdentifier(identifier: string): Promise<User | null> {
    const isPhone = /^\+?\d+$/.test(identifier);
    const query = isPhone 
      ? 'SELECT * FROM users WHERE phone_number = $1' 
      : 'SELECT * FROM users WHERE email = $1';
      
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
      defaultCurrency: row.default_currency,
      upiId: row.upi_id,
      isVerified: row.is_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async create(email: string | null, phoneNumber: string | null, displayName: string, passwordHash?: string): Promise<User> {
    const res = await pool.query(
      `INSERT INTO users (email, phone_number, display_name, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [email, phoneNumber, displayName, passwordHash]
    );
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      phoneNumber: row.phone_number,
      displayName: row.display_name,
      passwordHash: row.password_hash,
      avatarUrl: row.avatar_url,
      defaultCurrency: row.default_currency,
      upiId: row.upi_id,
      isVerified: row.is_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async updatePassword(userId: string, newHash: string): Promise<void> {
    await pool.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [newHash, userId]);
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
}

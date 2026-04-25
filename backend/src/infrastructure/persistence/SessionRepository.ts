import { pool } from '../../config/db';
import { Cacheable, invalidateCache } from './CachingRepository';

export interface UserSession {
  id: string;
  userId: string;
  refreshTokenId: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActive: Date;
  createdAt: Date;
}

export class SessionRepository {
  static async createSession(
    userId: string,
    refreshTokenId: string,
    ipAddress: string | null,
    userAgent: string | null
  ): Promise<UserSession> {
    const res = await pool.query(
      `INSERT INTO user_sessions (user_id, refresh_token_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, refreshTokenId, ipAddress || null, userAgent || null]
    );
    await invalidateCache('sessions', userId);
    return this.mapRow(res.rows[0]);
  }

  @Cacheable('sessions', (userId: string) => userId, 3600)
  static async findByUserId(userId: string): Promise<UserSession[]> {
    const res = await pool.query({
      name: 'fetch-sessions-by-user-id',
      text: `SELECT us.* FROM user_sessions us
       JOIN refresh_tokens rt ON rt.id = us.refresh_token_id
       WHERE us.user_id = $1 AND rt.revoked_at IS NULL AND rt.expires_at > now()
       ORDER BY us.last_active DESC`,
      values: [userId]
    });
    return res.rows.map(this.mapRow);
  }

  static async findById(sessionId: string): Promise<UserSession | null> {
    const res = await pool.query({
      name: 'fetch-session-by-id',
      text: `SELECT * FROM user_sessions WHERE id = $1`,
      values: [sessionId]
    });
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  static async deleteSession(sessionId: string): Promise<void> {
    const res = await pool.query(`SELECT user_id FROM user_sessions WHERE id = $1`, [sessionId]);
    if (res.rows[0]) {
      const userId = res.rows[0].user_id;
      // Also revoke the associated refresh token
      await pool.query(
        `UPDATE refresh_tokens SET revoked_at = now()
         WHERE id = (SELECT refresh_token_id FROM user_sessions WHERE id = $1)`,
        [sessionId]
      );
      await pool.query(`DELETE FROM user_sessions WHERE id = $1`, [sessionId]);
      await invalidateCache('sessions', userId);
    }
  }

  static async deleteAllOtherSessions(userId: string, currentRefreshTokenId: string): Promise<void> {
    // Revoke all other refresh tokens for this user
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = now()
       WHERE user_id = $1 AND id != $2 AND revoked_at IS NULL`,
      [userId, currentRefreshTokenId]
    );
    await pool.query(
      `DELETE FROM user_sessions WHERE user_id = $1 AND refresh_token_id != $2`,
      [userId, currentRefreshTokenId]
    );
    await invalidateCache('sessions', userId);
  }

  static async updateLastActive(sessionId: string): Promise<void> {
    await pool.query(
      `UPDATE user_sessions SET last_active = now() WHERE id = $1`,
      [sessionId]
    );
  }

  static async deleteByRefreshTokenId(refreshTokenId: string): Promise<void> {
    const res = await pool.query(`SELECT user_id FROM user_sessions WHERE refresh_token_id = $1`, [refreshTokenId]);
    if (res.rows[0]) {
      const userId = res.rows[0].user_id;
      await pool.query(
        `DELETE FROM user_sessions WHERE refresh_token_id = $1`,
        [refreshTokenId]
      );
      await invalidateCache('sessions', userId);
    }
  }

  private static mapRow(row: any): UserSession {
    return {
      id: row.id,
      userId: row.user_id,
      refreshTokenId: row.refresh_token_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      lastActive: row.last_active,
      createdAt: row.created_at,
    };
  }
}

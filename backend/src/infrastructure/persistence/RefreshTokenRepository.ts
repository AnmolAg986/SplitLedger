import { pool } from '../../config/db';

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  revokedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

export class RefreshTokenRepository {
  static async storeToken(userId: string, tokenHash: string, familyId: string, expiresAt: Date): Promise<RefreshToken> {
    const res = await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, tokenHash, familyId, expiresAt]
    );
    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      familyId: row.family_id,
      revokedAt: row.revoked_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    };
  }

  static async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const res = await pool.query(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      familyId: row.family_id,
      revokedAt: row.revoked_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    };
  }

  static async revokeToken(tokenId: string): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`,
      [tokenId]
    );
  }

  static async revokeFamily(familyId: string): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1`,
      [familyId]
    );
  }

  static async revokeAllForUser(userId: string): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1`,
      [userId]
    );
  }
}

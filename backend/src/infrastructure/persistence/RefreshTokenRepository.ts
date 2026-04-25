import { pool } from '../../config/db';
import { Cacheable, invalidateCache } from './CachingRepository';

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

  @Cacheable('rt', (hash: string) => hash, 86400) // 24h
  static async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const res = await pool.query({
      name: 'fetch-refresh-token-by-hash',
      text: `SELECT * FROM refresh_tokens WHERE token_hash = $1`,
      values: [tokenHash]
    });
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
    const res = await pool.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1 RETURNING token_hash`,
      [tokenId]
    );
    if (res.rows[0]) await invalidateCache('rt', res.rows[0].token_hash);
  }

  static async revokeFamily(familyId: string): Promise<void> {
    const res = await pool.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1 RETURNING token_hash`,
      [familyId]
    );
    for (const row of res.rows) {
      await invalidateCache('rt', row.token_hash);
    }
  }

  static async revokeAllForUser(userId: string): Promise<void> {
    const res = await pool.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 RETURNING token_hash`,
      [userId]
    );
    for (const row of res.rows) {
      await invalidateCache('rt', row.token_hash);
    }
  }
}

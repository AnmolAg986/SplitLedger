import { pool } from '../../config/db';

export const MAX_DISTINCT_EMOJI = 8;

export interface ReactionSummary {
  emoji: string;
  count: number;
  users: { id: string; display_name: string }[];
}

export class ReactionRepository {
  /** Toggle a reaction. Returns { added: boolean, reactions: ReactionSummary[] } */
  static async toggle(
    messageId: string,
    messageType: 'dm' | 'group',
    userId: string,
    emoji: string
  ): Promise<{ added: boolean; reactions: ReactionSummary[] }> {
    // Check if already reacted
    const existing = await pool.query(
      `SELECT id FROM message_reactions
       WHERE message_id = $1 AND message_type = $2 AND user_id = $3 AND emoji = $4`,
      [messageId, messageType, userId, emoji]
    );

    if (existing.rows.length > 0) {
      // Remove reaction
      await pool.query(
        `DELETE FROM message_reactions
         WHERE message_id = $1 AND message_type = $2 AND user_id = $3 AND emoji = $4`,
        [messageId, messageType, userId, emoji]
      );
      const reactions = await this.getSummary(messageId, messageType);
      return { added: false, reactions };
    }

    // Check distinct emoji cap (max 8 per message)
    const distinctCheck = await pool.query(
      `SELECT COUNT(DISTINCT emoji) as cnt FROM message_reactions
       WHERE message_id = $1 AND message_type = $2`,
      [messageId, messageType]
    );
    const distinct = parseInt(distinctCheck.rows[0].cnt, 10);
    
    // Allow adding if emoji already exists, or if under cap
    const emojiExists = await pool.query(
      `SELECT 1 FROM message_reactions WHERE message_id = $1 AND message_type = $2 AND emoji = $3 LIMIT 1`,
      [messageId, messageType, emoji]
    );
    
    if (distinct >= MAX_DISTINCT_EMOJI && emojiExists.rows.length === 0) {
      throw new Error(`Max ${MAX_DISTINCT_EMOJI} distinct emoji per message`);
    }

    await pool.query(
      `INSERT INTO message_reactions (message_id, message_type, user_id, emoji)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [messageId, messageType, userId, emoji]
    );

    const reactions = await this.getSummary(messageId, messageType);
    return { added: true, reactions };
  }

  static async getSummary(messageId: string, messageType: 'dm' | 'group'): Promise<ReactionSummary[]> {
    const res = await pool.query(
      `SELECT r.emoji,
              COUNT(*)::int as count,
              json_agg(json_build_object('id', u.id, 'display_name', u.display_name)) as users
       FROM message_reactions r
       JOIN users u ON r.user_id = u.id
       WHERE r.message_id = $1 AND r.message_type = $2
       GROUP BY r.emoji
       ORDER BY MIN(r.created_at)`,
      [messageId, messageType]
    );
    return res.rows;
  }

  /** Attach reactions to a batch of messages */
  static async attachToMessages(
    messages: any[],
    messageType: 'dm' | 'group'
  ): Promise<any[]> {
    if (messages.length === 0) return messages;
    const ids = messages.map(m => m.id);
    const res = await pool.query(
      `SELECT r.message_id, r.emoji,
              COUNT(*)::int as count,
              json_agg(json_build_object('id', u.id, 'display_name', u.display_name)) as users
       FROM message_reactions r
       JOIN users u ON r.user_id = u.id
       WHERE r.message_id = ANY($1) AND r.message_type = $2
       GROUP BY r.message_id, r.emoji
       ORDER BY MIN(r.created_at)`,
      [ids, messageType]
    );

    const map = new Map<string, ReactionSummary[]>();
    for (const row of res.rows) {
      if (!map.has(row.message_id)) map.set(row.message_id, []);
      map.get(row.message_id)!.push({ emoji: row.emoji, count: row.count, users: row.users });
    }

    return messages.map(m => ({ ...m, reactions: map.get(m.id) || [] }));
  }
}

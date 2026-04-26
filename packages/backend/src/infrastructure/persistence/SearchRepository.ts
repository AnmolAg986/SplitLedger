import { pool } from '../../config/db';

export interface SearchResult {
  id: string;
  type: 'friend' | 'group' | 'expense' | 'message';
  title: string;
  subtitle?: string;
  matchSnippet?: string;
  route: string;
}

export class SearchRepository {
  /**
   * Search friends (users table) by name or username where a friendship exists
   */
  static async searchFriends(userId: string, query: string): Promise<SearchResult[]> {
    const res = await pool.query(
      `SELECT
         u.id,
         u.display_name,
         u.username,
         ts_rank(to_tsvector('english', u.display_name || ' ' || COALESCE(u.username, '')), plainto_tsquery('english', $2)) as rank
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.user_id_1 = $1 THEN f.user_id_2 ELSE f.user_id_1 END
       WHERE (f.user_id_1 = $1 OR f.user_id_2 = $1)
         AND f.status = 'accepted'
         AND to_tsvector('english', u.display_name || ' ' || COALESCE(u.username, '')) @@ plainto_tsquery('english', $2)
       ORDER BY rank DESC
       LIMIT 5`,
      [userId, query]
    );
    
    return res.rows.map(row => ({
      id: `friend_${row.id}`,
      type: 'friend',
      title: row.display_name,
      subtitle: row.username ? `@${row.username}` : undefined,
      route: `/friends/${row.id}`
    }));
  }

  /**
   * Search groups by name where user is a member
   */
  static async searchGroups(userId: string, query: string): Promise<SearchResult[]> {
    const res = await pool.query(
      `SELECT
         g.id,
         g.name,
         ts_rank(to_tsvector('english', g.name), plainto_tsquery('english', $2)) as rank
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = $1
         AND g.is_archived = false
         AND to_tsvector('english', g.name) @@ plainto_tsquery('english', $2)
       ORDER BY rank DESC
       LIMIT 5`,
      [userId, query]
    );

    return res.rows.map(row => ({
      id: `group_${row.id}`,
      type: 'group',
      title: row.name,
      subtitle: 'Group',
      route: `/groups/${row.id}`
    }));
  }

  /**
   * Search expenses by description where user is involved
   */
  static async searchExpenses(userId: string, query: string): Promise<SearchResult[]> {
    const res = await pool.query(
      `SELECT DISTINCT
         e.id,
         e.description,
         e.amount,
         e.currency,
         ts_rank(to_tsvector('english', e.description), plainto_tsquery('english', $2)) as rank
       FROM expenses e
       LEFT JOIN expense_splits es ON e.id = es.expense_id
       WHERE (e.paid_by = $1 OR es.user_id = $1)
         AND e.deleted_at IS NULL
         AND to_tsvector('english', e.description) @@ plainto_tsquery('english', $2)
       ORDER BY rank DESC
       LIMIT 5`,
      [userId, query]
    );

    return res.rows.map(row => ({
      id: `expense_${row.id}`,
      type: 'expense',
      title: row.description,
      subtitle: `${row.currency} ${parseFloat(row.amount).toFixed(2)}`,
      route: `/expenses/${row.id}`
    }));
  }

  /**
   * Search messages (direct and group) where user is involved
   */
  static async searchMessages(userId: string, query: string): Promise<SearchResult[]> {
    const res = await pool.query(
      `SELECT * FROM (
         SELECT
           dm.id,
           dm.content,
           'direct' as context_type,
           dm.sender_id as related_id,
           ts_rank(to_tsvector('english', dm.content), plainto_tsquery('english', $2)) as rank
         FROM direct_messages dm
         WHERE (dm.sender_id = $1 OR dm.receiver_id = $1)
           AND dm.is_deleted = false
           AND to_tsvector('english', dm.content) @@ plainto_tsquery('english', $2)
           
         UNION ALL
         
         SELECT
           gm.id,
           gm.content,
           'group' as context_type,
           gm.group_id as related_id,
           ts_rank(to_tsvector('english', gm.content), plainto_tsquery('english', $2)) as rank
         FROM group_messages gm
         JOIN group_members gmem ON gm.group_id = gmem.group_id
         WHERE gmem.user_id = $1
           AND gm.is_deleted = false
           AND to_tsvector('english', gm.content) @@ plainto_tsquery('english', $2)
       ) as results
       ORDER BY rank DESC
       LIMIT 5`,
      [userId, query]
    );

    return res.rows.map(row => ({
      id: `message_${row.id}`,
      type: 'message',
      title: row.content.length > 40 ? row.content.substring(0, 40) + '...' : row.content,
      subtitle: row.context_type === 'direct' ? 'Direct Message' : 'Group Message',
      route: row.context_type === 'direct' ? `/friends/${row.related_id}?messageId=${row.id}` : `/groups/${row.related_id}?messageId=${row.id}`
    }));
  }
}

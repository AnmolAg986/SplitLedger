import { pool } from '../../config/db';
import { ioInstance } from '../websocket/socketServer';

export type GroupEventType =
  | 'expense_added'
  | 'expense_edited'
  | 'expense_deleted'
  | 'member_joined'
  | 'member_left'
  | 'member_approved'
  | 'member_role_changed'
  | 'settled'
  | 'group_archived'
  | 'group_updated';

export interface GroupActivityRow {
  id: string;
  group_id: string;
  actor_id: string;
  actor_name: string;
  actor_avatar?: string;
  event_type: GroupEventType;
  payload: Record<string, any>;
  created_at: string;
}

export class GroupActivityRepository {
  /** Log a new activity event and emit it over WebSocket. */
  static async log(
    groupId: string,
    actorId: string,
    eventType: GroupEventType,
    payload: Record<string, any> = {}
  ): Promise<void> {
    try {
      const res = await pool.query(
        `INSERT INTO group_activity (group_id, actor_id, event_type, payload)
         VALUES ($1, $2, $3, $4)
         RETURNING id, created_at`,
        [groupId, actorId, eventType, JSON.stringify(payload)]
      );

      // Get actor display info for real-time event
      const actorRes = await pool.query(
        `SELECT display_name, avatar_url FROM users WHERE id = $1`,
        [actorId]
      );
      const actor = actorRes.rows[0];

      const event: GroupActivityRow = {
        id: res.rows[0].id,
        group_id: groupId,
        actor_id: actorId,
        actor_name: actor?.display_name ?? 'Unknown',
        actor_avatar: actor?.avatar_url,
        event_type: eventType,
        payload,
        created_at: res.rows[0].created_at,
      };

      // Emit real-time event to all group members
      const io = ioInstance;
      if (io) {
        io.to(`group:${groupId}`).emit('group_activity', event);
      }
    } catch (err) {
      // Non-blocking — never let activity logging break core flows
      console.error('[GroupActivityRepository] log error:', err);
    }
  }

  /** Paginated cursor-based fetch. cursor = created_at of oldest item in previous page. */
  static async getActivity(
    groupId: string,
    limit = 20,
    cursor?: string
  ): Promise<GroupActivityRow[]> {
    const params: any[] = [groupId, limit];
    let cursorClause = '';

    if (cursor) {
      params.push(cursor);
      cursorClause = `AND ga.created_at < $${params.length}`;
    }

    const res = await pool.query(
      `SELECT
         ga.id, ga.group_id, ga.actor_id, ga.event_type, ga.payload, ga.created_at,
         u.display_name AS actor_name, u.avatar_url AS actor_avatar
       FROM group_activity ga
       JOIN users u ON u.id = ga.actor_id
       WHERE ga.group_id = $1
         ${cursorClause}
       ORDER BY ga.created_at DESC
       LIMIT $2`,
      params
    );

    return res.rows.map(r => ({
      ...r,
      payload: r.payload ?? {}
    }));
  }
}

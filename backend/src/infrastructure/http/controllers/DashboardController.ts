import { Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { DashboardRepository } from '../../persistence/DashboardRepository';
import { pool } from '../../../config/db';
import { safeRedisGet, safeRedisSetEx } from '../../../config/redis';

export class DashboardController {

  static async getConnectionsActivity(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Friends with recent activity timestamp
      const friendsRes = await pool.query(
        `SELECT
           u.id, u.display_name, u.email, u.avatar_url,
           'friend' as connection_type,
           GREATEST(
             COALESCE(f.last_interaction, f.created_at),
             COALESCE((SELECT MAX(dm.created_at) FROM direct_messages dm 
               WHERE (dm.sender_id = $1 AND dm.receiver_id = u.id) 
                  OR (dm.sender_id = u.id AND dm.receiver_id = $1)), f.created_at)
           ) as last_activity,
           CASE WHEN f.user_id_1 = $1 THEN f.nickname_1 ELSE f.nickname_2 END as nickname
         FROM friendships f
         JOIN users u ON u.id = CASE WHEN f.user_id_1 = $1 THEN f.user_id_2 ELSE f.user_id_1 END
         WHERE (f.user_id_1 = $1 OR f.user_id_2 = $1)
           AND f.status = 'accepted'`,
        [userId]
      );

      // Groups with recent activity timestamp
      const groupsRes = await pool.query(
        `SELECT
           g.id, g.name as display_name, g.type, g.avatar_url, g.is_archived,
           'group' as connection_type,
           COUNT(gm2.user_id) as member_count,
           GREATEST(
             g.created_at,
             COALESCE((SELECT MAX(e.created_at) FROM expenses e WHERE e.group_id = g.id AND e.deleted_at IS NULL), g.created_at),
             COALESCE((SELECT MAX(gm3.created_at) FROM group_messages gm3 WHERE gm3.group_id = g.id), g.created_at)
           ) as last_activity
         FROM "groups" g
         JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
         JOIN group_members gm2 ON gm2.group_id = g.id
         WHERE g.deleted_at IS NULL AND g.is_archived = false
         GROUP BY g.id, g.name, g.type, g.avatar_url, g.is_archived, g.created_at`,
        [userId]
      );

      const combined = [
        ...friendsRes.rows,
        ...groupsRes.rows
      ].sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());

      return res.status(200).json(combined);
    } catch (e: unknown) {
      console.error('[DashboardController] getConnectionsActivity error:', e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  static async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const cacheKey = `dashboard:summary:${userId}`;
      const cached = await safeRedisGet(cacheKey);
      if (cached) {
        try {
          return res.status(200).json(JSON.parse(cached));
        } catch (e) {
          console.warn('[DashboardController] Failed to parse cached dashboard');
        }
      }

      const [metrics, onboarding, insights, recentActivity, focusInsight, advanced] = await Promise.all([
        DashboardRepository.getMetrics(userId),
        DashboardRepository.hasOnboarded(userId),
        DashboardRepository.getSmartInsights(userId),
        DashboardRepository.getRecentActivityMini(userId),
        DashboardRepository.getFocusInsight(userId),
        DashboardRepository.getAdvancedInsights(userId),
      ]);

      const responseData = {
        metrics,
        onboarding,
        insights,
        recentActivity,
        focusInsight,
        advanced,
      };

      await safeRedisSetEx(cacheKey, 120, JSON.stringify(responseData));

      return res.status(200).json(responseData);
    } catch (e: unknown) {
      console.error('[DashboardController] getSummary error:', e);
      return res.status(500).json({ error: 'Internal server error while fetching dashboard.' });
    }
  }

  // ── Phase 3+: Uncomment when reaching those phases ──
  // static async getFullActivity(req: Request, res: Response) {
  //   try {
  //     const userId = req.user?.id;
  //     if (!userId) {
  //       return res.status(401).json({ error: 'Unauthorized' });
  //     }
  //     const activity = await DashboardRepository.getFullActivity(userId);
  //     return res.status(200).json(activity);
  //   } catch (e: unknown) {
  //     console.error('[DashboardController] getFullActivity error:', e);
  //     return res.status(500).json({ error: 'Internal server error while fetching activity.' });
  //   }
  // }
}

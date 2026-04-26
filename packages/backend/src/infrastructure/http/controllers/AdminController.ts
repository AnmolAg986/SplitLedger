import { Request, Response } from 'express';
import { pool } from '../../../config/db';
import * as jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import { ioInstance } from '../../websocket/socketServer';

export class AdminController {

  static async login(req: Request, res: Response) {
    try {
      const { password } = req.body;
      const adminSecret = env.ADMIN_SECRET || 'supersecretadmin'; // Fallback if not configured

      if (password !== adminSecret) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }

      // Generate a special admin JWT
      const token = jwt.sign({ userId: 'admin_user_id', role: 'admin' }, env.JWT_SECRET, { expiresIn: '1d' });
      
      return res.status(200).json({ token });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getUsers(req: Request, res: Response) {
    try {
      const q = req.query.q as string;
      let query = `
        SELECT id, display_name, username, email, phone_number, is_verified, created_at, is_disabled
        FROM users
      `;
      const params: any[] = [];

      if (q) {
        query += ` WHERE display_name ILIKE $1 OR email ILIKE $1 OR username ILIKE $1`;
        params.push(`%${q}%`);
      }
      query += ` ORDER BY created_at DESC LIMIT 50`;

      const result = await pool.query(query, params);
      return res.status(200).json(result.rows);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  static async toggleUserStatus(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const { isDisabled } = req.body;

      const result = await pool.query(
        `UPDATE users SET is_disabled = $1 WHERE id = $2 RETURNING id, is_disabled`,
        [isDisabled, userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (isDisabled) {
        // Option 1: To actually kick them out instantly, we would need to track active sessions in Redis.
        // For now, we will add an explicit is_disabled check to authMiddleware, or we can just trust
        // that future logins will fail.
      }

      return res.status(200).json(result.rows[0]);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update user status' });
    }
  }

  static async getGroup(req: Request, res: Response) {
    try {
      const groupId = req.params.id;
      const groupRes = await pool.query(`SELECT * FROM groups WHERE id = $1`, [groupId]);
      if (groupRes.rowCount === 0) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const membersRes = await pool.query(
        `SELECT u.id, u.display_name, u.email, gm.role 
         FROM group_members gm JOIN users u ON u.id = gm.user_id 
         WHERE gm.group_id = $1`,
        [groupId]
      );

      return res.status(200).json({
        ...groupRes.rows[0],
        members: membersRes.rows
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch group' });
    }
  }

  static async getAuditLogs(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const result = await pool.query(
        `SELECT a.*, u.display_name as actor_name
         FROM audit_logs a
         LEFT JOIN users u ON a.actor_id = u.id
         ORDER BY a.created_at DESC
         LIMIT $1`,
        [limit]
      );
      return res.status(200).json(result.rows);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }

  static async getStats(req: Request, res: Response) {
    try {
      const usersRes = await pool.query(`SELECT COUNT(*) FROM users`);
      const expensesRes = await pool.query(`SELECT COUNT(*) FROM expenses WHERE deleted_at IS NULL`);
      const groupsRes = await pool.query(`SELECT COUNT(*) FROM groups WHERE is_archived = false`);
      
      const activeWebsockets = ioInstance?.engine?.clientsCount || 0;

      return res.status(200).json({
        totalUsers: parseInt(usersRes.rows[0].count, 10),
        totalExpenses: parseInt(expensesRes.rows[0].count, 10),
        activeGroups: parseInt(groupsRes.rows[0].count, 10),
        activeWebsockets
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }
  }

  static async triggerCron(req: Request, res: Response) {
    try {
      const { job } = req.body;
      
      // We would normally dispatch this to a queue or call the service directly
      if (job === 'sendReminders') {
        // e.g. await NotificationService.processReminders();
        return res.status(200).json({ message: 'Reminders job triggered' });
      }

      return res.status(400).json({ error: 'Unknown job' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to trigger cron' });
    }
  }
}

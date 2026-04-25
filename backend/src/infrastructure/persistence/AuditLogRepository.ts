import { pool } from '../../config/db';

export class AuditLogRepository {
  static async log(
    userId: string | null,
    action: string,
    resource: string | null = null,
    resourceId: string | null = null,
    ipAddress: string | null = null,
    userAgent: string | null = null
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, action, resource, resourceId, ipAddress, userAgent]
      );
    } catch (e) {
      console.error('Failed to write audit log:', e);
    }
  }
}

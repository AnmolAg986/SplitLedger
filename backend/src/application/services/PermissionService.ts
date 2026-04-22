import { pool } from '../../config/db';

/**
 * Permission matrix for group roles.
 *
 * Role hierarchy: owner > admin > member > viewer
 *
 * Supported actions:
 *   add_expense        — create a new expense in the group
 *   edit_any_expense   — edit expenses created by any member
 *   delete_any_expense — delete expenses created by any member
 *   remove_member      — kick a member from the group
 *   promote_admin      — change a member's role to admin (owner only)
 *   archive_group      — archive / unarchive the group
 *   lock_expenses      — bulk-lock expenses by date
 *   update_group       — rename, change settings
 *   delete_group       — permanently delete the group
 *   view               — read group data (all roles)
 */

type Action =
  | 'add_expense'
  | 'edit_any_expense'
  | 'delete_any_expense'
  | 'remove_member'
  | 'promote_admin'
  | 'archive_group'
  | 'lock_expenses'
  | 'update_group'
  | 'delete_group'
  | 'view';

const PERMISSIONS: Record<string, Set<Action>> = {
  owner: new Set([
    'add_expense', 'edit_any_expense', 'delete_any_expense',
    'remove_member', 'promote_admin', 'archive_group',
    'lock_expenses', 'update_group', 'delete_group', 'view',
  ]),
  admin: new Set([
    'add_expense', 'edit_any_expense', 'delete_any_expense',
    'remove_member', 'archive_group', 'lock_expenses',
    'update_group', 'view',
  ]),
  member: new Set(['add_expense', 'view']),
  viewer: new Set(['view']),
};

export class PermissionService {
  /** Returns the role of userId in groupId, or null if not a member. */
  static async getRole(userId: string, groupId: string): Promise<string | null> {
    const res = await pool.query(
      `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [groupId, userId]
    );
    return res.rows[0]?.role ?? null;
  }

  /** Returns true if userId has permission to perform action in groupId. */
  static async can(userId: string, groupId: string, action: Action): Promise<boolean> {
    const role = await this.getRole(userId, groupId);
    if (!role) return false;
    return PERMISSIONS[role]?.has(action) ?? false;
  }

  /**
   * Throws an HTTP-style error object if the user cannot perform the action.
   * Designed to be caught in controllers:
   *   await PermissionService.assertCan(userId, groupId, 'edit_any_expense');
   */
  static async assertCan(
    userId: string,
    groupId: string,
    action: Action
  ): Promise<void> {
    const allowed = await this.can(userId, groupId, action);
    if (!allowed) {
      const err: any = new Error(`Insufficient permissions: ${action}`);
      err.status = 403;
      throw err;
    }
  }

  /** Returns the full permissions object for a user in a group (for frontend). */
  static async getPermissions(userId: string, groupId: string) {
    const role = await this.getRole(userId, groupId);
    if (!role) return null;
    const allowed = PERMISSIONS[role] ?? new Set();
    return {
      role,
      can: {
        addExpense:       allowed.has('add_expense'),
        editAnyExpense:   allowed.has('edit_any_expense'),
        deleteAnyExpense: allowed.has('delete_any_expense'),
        removeMember:     allowed.has('remove_member'),
        promoteAdmin:     allowed.has('promote_admin'),
        archiveGroup:     allowed.has('archive_group'),
        lockExpenses:     allowed.has('lock_expenses'),
        updateGroup:      allowed.has('update_group'),
        deleteGroup:      allowed.has('delete_group'),
        view:             allowed.has('view'),
      }
    };
  }
}

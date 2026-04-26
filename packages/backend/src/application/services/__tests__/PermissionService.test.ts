import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionService } from '../../../application/services/PermissionService';
import { pool } from '../../../config/db';

// Mock the database pool
vi.mock('../../../config/db', () => ({
  pool: {
    query: vi.fn(),
  },
}));

describe('PermissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRole', () => {
    it('returns the role if user is an accepted member', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{ role: 'admin' }] } as any);
      
      const role = await PermissionService.getRole('user-1', 'group-1');
      expect(role).toBe('admin');
      expect(pool.query).toHaveBeenCalledWith(
        `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = 'accepted'`,
        ['group-1', 'user-1']
      );
    });

    it('returns null if user is not in the group or not accepted', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);
      
      const role = await PermissionService.getRole('user-1', 'group-1');
      expect(role).toBeNull();
    });
  });

  describe('can', () => {
    it('returns true if role has permission', async () => {
      // Owner can delete_group
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{ role: 'owner' }] } as any);
      expect(await PermissionService.can('user-1', 'group-1', 'delete_group')).toBe(true);
    });

    it('returns false if role does not have permission', async () => {
      // Member cannot delete_group
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{ role: 'member' }] } as any);
      expect(await PermissionService.can('user-1', 'group-1', 'delete_group')).toBe(false);
    });

    it('returns false if user is not in group', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);
      expect(await PermissionService.can('user-1', 'group-1', 'view')).toBe(false);
    });
  });

  describe('assertCan', () => {
    it('resolves if user has permission', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{ role: 'admin' }] } as any);
      await expect(PermissionService.assertCan('user-1', 'group-1', 'add_expense')).resolves.toBeUndefined();
    });

    it('throws 403 error if user lacks permission', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{ role: 'viewer' }] } as any);
      
      try {
        await PermissionService.assertCan('user-1', 'group-1', 'add_expense');
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.message).toBe('Insufficient permissions: add_expense');
        expect(err.status).toBe(403);
      }
    });
  });

  describe('getPermissions', () => {
    it('returns full permission map for a role', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{ role: 'member' }] } as any);
      
      const perms = await PermissionService.getPermissions('user-1', 'group-1');
      expect(perms).toEqual({
        role: 'member',
        can: {
          addExpense: true,
          editAnyExpense: false,
          deleteAnyExpense: false,
          removeMember: false,
          promoteAdmin: false,
          archiveGroup: false,
          lockExpenses: false,
          updateGroup: false,
          deleteGroup: false,
          view: true,
        },
      });
    });

    it('returns null if user is not in group', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);
      
      const perms = await PermissionService.getPermissions('user-1', 'group-1');
      expect(perms).toBeNull();
    });
  });
});

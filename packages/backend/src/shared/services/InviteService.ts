import { v4 as uuidv4 } from 'uuid';
import { GroupRepository } from '../../infrastructure/persistence/GroupRepository';

export class InviteService {
  /**
   * Generates a unique invite token for a group.
   * In a real app, we might store this in a separate invites table with expiration,
   * but for now we'll use the column in the groups table.
   */
  static async getGroupInviteLink(groupId: string): Promise<string> {
    const group = await GroupRepository.getGroupDetail(groupId);
    if (!group) throw new Error('Group not found');
    
    let token = group.invite_token;
    if (!token) {
      // Regenerate if missing
      token = uuidv4();
      await GroupRepository.updateGroupDetails(groupId, { inviteToken: token } as any);
    }
    
    // In production, use the real domain. For now localhost.
    return `http://localhost:5173/join/group/${token}`;
  }

  /**
   * Generates a personal invite link for a user to be added as a friend.
   */
  static async getUserInviteLink(userId: string): Promise<string> {
    // We'll use the userId directly or a hash for simplicity.
    // A better way is a dedicated token table.
    return `http://localhost:5173/join/user/${userId}`;
  }
}

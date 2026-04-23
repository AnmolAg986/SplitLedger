import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../../shared/utils/jwt';
import { ChatRepository } from '../persistence/ChatRepository';
import { UserRepository } from '../persistence/UserRepository';
import { FriendRepository } from '../persistence/FriendRepository';
import { ReactionRepository } from '../persistence/ReactionRepository';

export let ioInstance: Server | null = null;
export const onlineUsers = new Map<string, { socketId: string; lastSeen: Date }>();

export function initSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
      credentials: true
    }
  });
  ioInstance = io;

  // JWT authentication middleware for Socket.IO
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = (socket as any).userId as string;
    console.log(`[Socket.IO] User connected: ${userId}`);

    // Fetch displayName once for this socket session
    let displayName = 'Someone';
    try {
      const user = await UserRepository.findById(userId);
      if (user) displayName = user.displayName;
    } catch { /* non-fatal */ }

    // Per group typing debounce timers
    const groupTypingTimers = new Map<string, ReturnType<typeof setTimeout>>();

    // Track presence
    onlineUsers.set(userId, { socketId: socket.id, lastSeen: new Date() });
    
    // Announce online status to friends (could be optimized)
    socket.broadcast.emit('user_presence_change', { userId, online: true, lastSeen: new Date() });

    // Join personal room for direct notifications
    socket.join(userId);

    // Join a DM conversation room
    socket.on('join_conversation', (friendId: string) => {
      const roomId = [userId, friendId].sort().join('_');
      socket.join(roomId);
      console.log(`[Socket.IO] ${userId} joined room ${roomId}`);
    });

    // Leave a DM conversation room
    socket.on('leave_conversation', (friendId: string) => {
      const roomId = [userId, friendId].sort().join('_');
      socket.leave(roomId);
    });

    // Send a direct message
    socket.on('send_message', async (data: { friendId: string; content: string; replyToId?: string; attachmentUrl?: string; attachmentType?: string }) => {
      try {
        const message = await ChatRepository.sendMessage(userId, data.friendId, data.content ? data.content.trim() : '', data.replyToId, data.attachmentUrl, data.attachmentType);
        const roomId = [userId, data.friendId].sort().join('_');

        // Broadcast to the conversation room
        io.to(roomId).emit('new_message', message);

        // Also notify the friend directly (for unread badge updates)
        io.to(data.friendId).emit('message_notification', {
          senderId: userId,
          preview: data.content.substring(0, 50)
        });
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('edit_message', async (data: { messageId: string; friendId: string; content: string }) => {
      try {
        const message = await ChatRepository.editMessage(data.messageId, userId, data.content.trim());
        const roomId = [userId, data.friendId].sort().join('_');
        io.to(roomId).emit('message_edited', message);
      } catch (err) {
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    socket.on('delete_message', async (data: { messageId: string; friendId: string; forEveryone: boolean }) => {
      try {
        if (data.forEveryone) {
          const message = await ChatRepository.deleteForEveryone(data.messageId, userId);
          const roomId = [userId, data.friendId].sort().join('_');
          io.to(roomId).emit('message_deleted', message);
        } else {
          await ChatRepository.deleteForMe(data.messageId, userId);
          // Just acknowledge to sender
          socket.emit('message_deleted_for_me', { messageId: data.messageId });
        }
      } catch (err) {
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Typing indicator
    socket.on('typing', (friendId: string) => {
      const roomId = [userId, friendId].sort().join('_');
      socket.to(roomId).emit('user_typing', { userId });
    });

    socket.on('stop_typing', (friendId: string) => {
      const roomId = [userId, friendId].sort().join('_');
      socket.to(roomId).emit('user_stop_typing', { userId });
    });

    // Group Typing indicator
    socket.on('join_group_room', (groupId: string) => {
      socket.join(`group_${groupId}`);
    });

    socket.on('leave_group_room', (groupId: string) => {
      socket.leave(`group_${groupId}`);
    });

    socket.on('group_typing', (groupId: string) => {
      socket.to(`group_${groupId}`).emit('group_user_typing', { userId, displayName });

      // Auto-stop after 3s of no new keystrokes
      if (groupTypingTimers.has(groupId)) clearTimeout(groupTypingTimers.get(groupId)!);
      const timer = setTimeout(() => {
        socket.to(`group_${groupId}`).emit('group_user_stop_typing', { userId });
        groupTypingTimers.delete(groupId);
      }, 3000);
      groupTypingTimers.set(groupId, timer);
    });

    socket.on('group_stop_typing', (groupId: string) => {
      if (groupTypingTimers.has(groupId)) {
        clearTimeout(groupTypingTimers.get(groupId)!);
        groupTypingTimers.delete(groupId);
      }
      socket.to(`group_${groupId}`).emit('group_user_stop_typing', { userId });
    });

    // Group Messaging
    socket.on('send_group_message', async (data: { groupId: string; content: string; replyToId?: string; attachmentUrl?: string; attachmentType?: string }) => {
      try {
        const message = await ChatRepository.sendGroupMessage(data.groupId, userId, data.content ? data.content.trim() : '', data.replyToId, data.attachmentUrl, data.attachmentType);
        // sender_name is now included in the DB result via CTE JOIN
        io.to(`group_${data.groupId}`).emit('new_group_message', message);
      } catch (err) {
        socket.emit('error', { message: 'Failed to send group message' });
      }
    });

    socket.on('edit_group_message', async (data: { messageId: string; groupId: string; content: string }) => {
      try {
        const message = await ChatRepository.editGroupMessage(data.messageId, userId, data.content.trim());
        io.to(`group_${data.groupId}`).emit('group_message_edited', message);
      } catch (err) {
        socket.emit('error', { message: 'Failed to edit group message' });
      }
    });

    socket.on('delete_group_message', async (data: { messageId: string; groupId: string; forEveryone: boolean }) => {
      try {
        if (data.forEveryone) {
          const message = await ChatRepository.deleteGroupForEveryone(data.messageId, userId);
          io.to(`group_${data.groupId}`).emit('group_message_deleted', message);
        } else {
          await ChatRepository.deleteGroupForMe(data.messageId, userId);
          socket.emit('group_message_deleted_for_me', { messageId: data.messageId });
        }
      } catch (err) {
        socket.emit('error', { message: 'Failed to delete group message' });
      }
    });

    // Mark messages as read/delivered
    socket.on('mark_read', async (friendId: string) => {
      try {
        await ChatRepository.markAsRead(userId, friendId);
        io.to(friendId).emit('messages_read', { readBy: userId });
      } catch {
        // Non-critical
      }
    });

    socket.on('mark_delivered', async () => {
      try {
        // Mark all messages sent to this user as delivered
        await ChatRepository.markAsDelivered(userId);
        // Broadcast to all users that this user is online and received their messages
        socket.broadcast.emit('user_online_delivered', { userId });
      } catch {
        // Non-critical
      }
    });

    socket.on('mark_group_read', async (groupId: string) => {
      try {
        await ChatRepository.markGroupMessageRead(groupId, userId);
        io.to(`group_${groupId}`).emit('group_message_read', { groupId, readBy: userId });
      } catch {
        // Non-critical
      }
    });

    socket.on('mark_group_delivered', async (groupId: string) => {
      try {
        await ChatRepository.markGroupMessageDelivered(groupId, userId);
        io.to(`group_${groupId}`).emit('group_message_delivered', { groupId, deliveredTo: userId });
      } catch {
        // Non-critical
      }
    });

    // Message Reactions
    socket.on('react_message', async (data: { messageId: string; messageType: 'dm' | 'group'; emoji: string; friendId?: string; groupId?: string }) => {
      try {
        const { messageId, messageType, emoji, friendId, groupId } = data;
        const result = await ReactionRepository.toggle(messageId, messageType, userId, emoji);

        const payload = {
          messageId,
          messageType,
          reactions: result.reactions,
          added: result.added,
          emoji,
          userId
        };

        if (messageType === 'dm' && friendId) {
          const roomId = [userId, friendId].sort().join('_');
          io.to(roomId).emit('message_reaction_update', payload);
        } else if (messageType === 'group' && groupId) {
          io.to(`group_${groupId}`).emit('message_reaction_update', payload);
        }
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'Failed to react' });
      }
    });

    socket.on('disconnect', async () => {
      console.log(`[Socket.IO] User disconnected: ${userId}`);
      
      const now = new Date();
      onlineUsers.delete(userId);

      // Update last_seen_at in DB
      try {
        await UserRepository.updateLastSeen(userId, now);
        // Broadcast offline status
        socket.broadcast.emit('user_presence_change', { userId, online: false, lastSeen: now });
      } catch (err) {
        console.error('Failed to update last_seen_at', err);
      }
    });
  });

  return io;
}

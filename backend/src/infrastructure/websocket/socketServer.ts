import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../../shared/utils/jwt';
import { ChatRepository } from '../persistence/ChatRepository';

export let ioInstance: Server | null = null;

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

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    console.log(`[Socket.IO] User connected: ${userId}`);

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
    socket.on('send_message', async (data: { friendId: string; content: string }) => {
      try {
        const message = await ChatRepository.sendMessage(userId, data.friendId, data.content.trim());
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
      socket.to(`group_${groupId}`).emit('group_user_typing', { userId });
    });

    socket.on('group_stop_typing', (groupId: string) => {
      socket.to(`group_${groupId}`).emit('group_user_stop_typing', { userId });
    });

    // Mark messages as read
    socket.on('mark_read', async (friendId: string) => {
      try {
        await ChatRepository.markAsRead(userId, friendId);
        io.to(friendId).emit('messages_read', { readBy: userId });
      } catch {
        // Non-critical
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] User disconnected: ${userId}`);
    });
  });

  return io;
}

import { INotificationChannel, NotificationPayload } from './INotificationChannel';
import { ioInstance } from '../../../infrastructure/websocket/socketServer';
import { logger } from '../../utils/logger';

export class InAppNotificationChannel implements INotificationChannel {
  async send(userId: string, payload: NotificationPayload): Promise<void> {
    if (ioInstance) {
      ioInstance.to(userId).emit('notification', payload);
      logger.debug({ userId, payload }, 'Sent in-app notification');
    }
  }
}

import { NotificationRepository } from '../../infrastructure/persistence/NotificationRepository';
import { NotificationPreferenceRepository } from '../../infrastructure/persistence/NotificationPreferenceRepository';
import { NotificationFactory } from '../../shared/services/notifications/NotificationFactory';
import { NotificationPayload } from '../../shared/services/notifications/INotificationChannel';
import { logger } from '../../shared/utils/logger';

export class NotificationService {
  static async notify(
    userId: string,
    type: string,
    title: string,
    body: string,
    entityType?: string,
    entityId?: string
  ): Promise<void> {
    try {
      // 1. Persist to DB (always, unless preferences explicitly block even DB creation, 
      // but usually notifications are always in DB so they can be seen in the center)
      const notification = await NotificationRepository.create(userId, type, title, body, entityType, entityId);

      // 2. Fetch user preferences
      const prefs = await NotificationPreferenceRepository.getPreferences(userId);

      // 3. Build list of active channels via factory
      const channels = NotificationFactory.getChannelsForEvent(type, prefs);

      // Prepare payload
      const payload: NotificationPayload = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        entityType: notification.entityType,
        entityId: notification.entityId,
        createdAt: notification.createdAt.toISOString()
      };

      // 4. Dispatch in parallel
      const promises = channels.map(channel => channel.send(userId, payload));
      
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error(
            { userId, error: result.reason, channel: channels[index].constructor.name },
            'Failed to send notification through channel'
          );
        }
      });
      
    } catch (error) {
      logger.error({ userId, error, type }, 'Critical failure in NotificationService.notify');
    }
  }
}

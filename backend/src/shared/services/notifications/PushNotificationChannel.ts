import webPush from 'web-push';
import { INotificationChannel, NotificationPayload } from './INotificationChannel';
import { PushSubscriptionRepository } from '../../../infrastructure/persistence/PushSubscriptionRepository';
import { env } from '../../../config/env';
import { logger } from '../../utils/logger';

// Set VAPID keys if available
// In a real app, you would have VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in env
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'dummy_public_key';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'dummy_private_key';

try {
  webPush.setVapidDetails(
    'mailto:noreply@splitledger.dev',
    publicVapidKey,
    privateVapidKey
  );
} catch (e) {
  logger.warn('Failed to set VAPID details for web-push (keys might be invalid dummy keys)');
}

export class PushNotificationChannel implements INotificationChannel {
  async send(userId: string, payload: NotificationPayload): Promise<void> {
    const subscriptions = await PushSubscriptionRepository.findByUserId(userId);
    
    if (subscriptions.length === 0) {
      return;
    }

    const pushPayload = JSON.stringify(payload);

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, pushPayload);
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          logger.info(`Push subscription expired/removed for endpoint: ${sub.endpoint}`);
          await PushSubscriptionRepository.deleteByEndpoint(sub.endpoint);
        } else {
          logger.error({ error, userId }, 'Error sending push notification');
        }
      }
    }
  }
}

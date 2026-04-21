import { INotificationChannel } from './INotificationChannel';
import { InAppNotificationChannel } from './InAppNotificationChannel';
import { EmailNotificationChannel } from './EmailNotificationChannel';
import { PushNotificationChannel } from './PushNotificationChannel';
import { NotificationPreferences } from '../../../infrastructure/persistence/NotificationPreferenceRepository';

export class NotificationFactory {
  static getChannelsForEvent(eventType: string, prefs: NotificationPreferences): INotificationChannel[] {
    const channels: INotificationChannel[] = [];

    // In-app is always enabled unless explicitly turned off for everything
    if (prefs.inAppAll) {
      channels.push(new InAppNotificationChannel());
    }

    // Determine if Email should be sent
    let sendEmail = false;
    if (eventType === 'expense_added' || eventType === 'expense_updated' || eventType === 'expense_deleted') {
      sendEmail = prefs.emailOnExpense;
    } else if (eventType === 'settled') {
      sendEmail = prefs.emailOnSettlement;
    } else if (eventType === 'nudge') {
      sendEmail = prefs.emailOnNudge;
    }

    if (sendEmail) {
      channels.push(new EmailNotificationChannel());
    }

    // Determine if Push should be sent
    let sendPush = false;
    if (eventType === 'expense_added' || eventType === 'expense_updated' || eventType === 'expense_deleted') {
      sendPush = prefs.pushOnExpense;
    } else if (eventType === 'new_message' || eventType === 'new_group_message') {
      sendPush = prefs.pushOnChat;
    } else if (eventType === 'nudge') {
      sendPush = prefs.pushOnNudge;
    } else {
      // By default, assume we might want push for other major alerts
      sendPush = true;
    }

    if (sendPush) {
      channels.push(new PushNotificationChannel());
    }

    return channels;
  }
}

import { INotificationChannel, NotificationPayload } from './INotificationChannel';
import { sendEmail } from '../../utils/emailService';
import { UserRepository } from '../../../infrastructure/persistence/UserRepository';
import { logger } from '../../utils/logger';

export class EmailNotificationChannel implements INotificationChannel {
  async send(userId: string, payload: NotificationPayload): Promise<void> {
    const user = await UserRepository.findById(userId);
    if (!user || !user.email) {
      logger.warn({ userId }, 'EmailNotificationChannel: User not found or has no email');
      return;
    }

    const html = `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; background-color: #0c0c0e; color: #ffffff; padding: 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
        <h2 style="color: #ffffff; margin-bottom: 20px;">${payload.title}</h2>
        <p style="color: #a1a1aa; font-size: 15px; margin-bottom: 30px;">
          ${payload.body}
        </p>
      </div>
    `;

    await sendEmail(user.email, payload.title, html);
    logger.debug({ userId, email: user.email }, 'Sent email notification');
  }
}

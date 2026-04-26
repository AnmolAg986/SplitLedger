import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { NotificationRepository } from '../../persistence/NotificationRepository';
import { PushSubscriptionRepository } from '../../persistence/PushSubscriptionRepository';
import { NotificationPreferenceRepository } from '../../persistence/NotificationPreferenceRepository';
import { AppError } from '../../../shared/errors/AppError';

export class NotificationController {
  static async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const notifications = await NotificationRepository.getForUser(userId, limit, offset);
      return res.status(200).json(notifications);
    } catch (err) {
      next(err);
    }
  }

  static async getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const count = await NotificationRepository.getUnreadCount(userId);
      return res.status(200).json({ count });
    } catch (err) {
      next(err);
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      await NotificationRepository.markAllAsRead(userId);
      return res.status(200).json({ message: 'All notifications marked as read' });
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const id = req.params.id as string;
      await NotificationRepository.markAsRead(id, userId);
      return res.status(200).json({ message: 'Notification marked as read' });
    } catch (err) {
      next(err);
    }
  }

  static async deleteNotification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const id = req.params.id as string;
      await NotificationRepository.delete(id, userId);
      return res.status(200).json({ message: 'Notification deleted' });
    } catch (err) {
      next(err);
    }
  }

  // --- Push Subscriptions ---

  static async subscribePush(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        throw new AppError(400, 'BAD_REQUEST', 'Invalid push subscription payload');
      }

      await PushSubscriptionRepository.saveSubscription(userId, endpoint, keys.p256dh, keys.auth);
      return res.status(201).json({ message: 'Subscribed to push notifications' });
    } catch (err) {
      next(err);
    }
  }

  static async unsubscribePush(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const { endpoint } = req.body;
      if (!endpoint) {
        throw new AppError(400, 'BAD_REQUEST', 'Endpoint is required to unsubscribe');
      }

      await PushSubscriptionRepository.deleteByEndpoint(endpoint);
      return res.status(200).json({ message: 'Unsubscribed from push notifications' });
    } catch (err) {
      next(err);
    }
  }

  // --- Preferences ---

  static async getPreferences(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      const prefs = await NotificationPreferenceRepository.getPreferences(userId);
      return res.status(200).json(prefs);
    } catch (err) {
      next(err);
    }
  }

  static async updatePreferences(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      await NotificationPreferenceRepository.updatePreferences(userId, req.body);
      const updatedPrefs = await NotificationPreferenceRepository.getPreferences(userId);
      return res.status(200).json(updatedPrefs);
    } catch (err) {
      next(err);
    }
  }
}

export interface NotificationPayload {
  id?: string;
  title: string;
  body: string;
  type: string;
  entityType?: string;
  entityId?: string;
  createdAt?: string;
}

export interface INotificationChannel {
  send(userId: string, payload: NotificationPayload): Promise<void>;
}

import { create } from 'zustand';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  hasMore: boolean;
  isOpen: boolean;
  setNotifications: (notifications: Notification[], unreadCount: number) => void;
  addNotification: (notification: Notification) => void;
  appendNotifications: (notifications: Notification[], hasMore: boolean) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  setIsOpen: (isOpen: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  hasMore: true,
  isOpen: false,
  
  setNotifications: (notifications, unreadCount) => set({ 
    notifications, 
    unreadCount,
    hasMore: notifications.length === 50 // Assuming limit is 50
  }),
  
  addNotification: (notification) => set((state) => {
    // Prevent duplicates
    if (state.notifications.some(n => n.id === notification.id)) return state;
    return {
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    };
  }),

  appendNotifications: (newNotifications, hasMore) => set((state) => {
    const existingIds = new Set(state.notifications.map(n => n.id));
    const filtered = newNotifications.filter(n => !existingIds.has(n.id));
    return {
      notifications: [...state.notifications, ...filtered],
      hasMore
    };
  }),
  
  markAsRead: (id) => set((state) => {
    const isUnread = state.notifications.find(n => n.id === id && !n.isRead);
    return {
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: isUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
    };
  }),
  
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    unreadCount: 0
  })),

  deleteNotification: (id) => set((state) => {
    const notification = state.notifications.find(n => n.id === id);
    return {
      notifications: state.notifications.filter((n) => n.id !== id),
      unreadCount: (notification && !notification.isRead) ? Math.max(0, state.unreadCount - 1) : state.unreadCount
    };
  }),

  setIsOpen: (isOpen) => set({ isOpen }),
}));

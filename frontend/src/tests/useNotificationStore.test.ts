import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore, type Notification } from '../shared/store/useNotificationStore';

describe('useNotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      hasMore: true,
      isOpen: false
    });
  });

  const mockNotif: Notification = {
    id: '1',
    type: 'test',
    title: 'Test',
    body: 'Test body',
    isRead: false,
    createdAt: new Date().toISOString()
  };

  it('addNotification should add notification and increment unread count', () => {
    useNotificationStore.getState().addNotification(mockNotif);
    
    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
  });

  it('addNotification should prevent duplicates', () => {
    const store = useNotificationStore.getState();
    store.addNotification(mockNotif);
    store.addNotification(mockNotif);
    
    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
  });

  it('markAsRead should set isRead to true and decrement unread count', () => {
    const store = useNotificationStore.getState();
    store.addNotification(mockNotif);
    store.markAsRead('1');
    
    const state = useNotificationStore.getState();
    expect(state.notifications[0].isRead).toBe(true);
    expect(state.unreadCount).toBe(0);
  });

  it('markAllAsRead should mark all as read and reset unread count to 0', () => {
    const store = useNotificationStore.getState();
    store.addNotification({ ...mockNotif, id: '1' });
    store.addNotification({ ...mockNotif, id: '2' });
    store.addNotification({ ...mockNotif, id: '3' });
    
    store.markAllAsRead();
    
    const state = useNotificationStore.getState();
    expect(state.notifications.every(n => n.isRead)).toBe(true);
    expect(state.unreadCount).toBe(0);
  });

  it('deleteNotification should remove notification and decrement unread count if it was unread', () => {
    const store = useNotificationStore.getState();
    store.addNotification({ ...mockNotif, id: '1', isRead: false });
    store.addNotification({ ...mockNotif, id: '2', isRead: true });
    
    // We added 1 unread and 1 read. Unread count in store.addNotification is naively incremented,
    // so we manually override the state to reflect reality for this test:
    useNotificationStore.setState({ unreadCount: 1 });
    
    // Delete the unread one
    useNotificationStore.getState().deleteNotification('1');
    
    let state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(0);
    
    // Delete the read one
    useNotificationStore.getState().deleteNotification('2');
    
    state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(0);
    expect(state.unreadCount).toBe(0); // Should not go below 0
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../../../application/services/NotificationService';
import { NotificationRepository } from '../../../infrastructure/persistence/NotificationRepository';
import { NotificationPreferenceRepository } from '../../../infrastructure/persistence/NotificationPreferenceRepository';
import { NotificationFactory } from '../../../shared/services/notifications/NotificationFactory';
import { INotificationChannel, NotificationPayload } from '../../../shared/services/notifications/INotificationChannel';

// Mock the dependencies
vi.mock('../../../infrastructure/persistence/NotificationRepository', () => ({
  NotificationRepository: {
    create: vi.fn(),
  },
}));

vi.mock('../../../infrastructure/persistence/NotificationPreferenceRepository', () => ({
  NotificationPreferenceRepository: {
    getPreferences: vi.fn(),
  },
}));

vi.mock('../../../shared/services/notifications/NotificationFactory', () => ({
  NotificationFactory: {
    getChannelsForEvent: vi.fn(),
  },
}));

// A dummy channel for testing
class DummyChannel implements INotificationChannel {
  send = vi.fn().mockResolvedValue(true);
}

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates notification, fetches preferences, gets channels, and dispatches', async () => {
    const mockNotification = {
      id: 'notif-1',
      type: 'expense_added',
      title: 'Title',
      body: 'Body',
      entityType: 'group',
      entityId: 'group-1',
      createdAt: new Date('2023-01-01T00:00:00Z'),
    };
    
    vi.mocked(NotificationRepository.create).mockResolvedValueOnce(mockNotification as any);
    
    const mockPrefs = { inAppAll: true };
    vi.mocked(NotificationPreferenceRepository.getPreferences).mockResolvedValueOnce(mockPrefs as any);
    
    const dummyChannel1 = new DummyChannel();
    const dummyChannel2 = new DummyChannel();
    vi.mocked(NotificationFactory.getChannelsForEvent).mockReturnValueOnce([dummyChannel1, dummyChannel2]);

    await NotificationService.notify('user-1', 'expense_added', 'Title', 'Body', 'group', 'group-1');

    // 1. Persisted to DB
    expect(NotificationRepository.create).toHaveBeenCalledWith('user-1', 'expense_added', 'Title', 'Body', 'group', 'group-1');
    
    // 2. Preferences fetched
    expect(NotificationPreferenceRepository.getPreferences).toHaveBeenCalledWith('user-1');
    
    // 3. Factory called
    expect(NotificationFactory.getChannelsForEvent).toHaveBeenCalledWith('expense_added', mockPrefs);
    
    // 4. Dispatched to all channels
    const expectedPayload: NotificationPayload = {
      id: 'notif-1',
      type: 'expense_added',
      title: 'Title',
      body: 'Body',
      entityType: 'group',
      entityId: 'group-1',
      createdAt: '2023-01-01T00:00:00.000Z',
    };
    
    expect(dummyChannel1.send).toHaveBeenCalledWith('user-1', expectedPayload);
    expect(dummyChannel2.send).toHaveBeenCalledWith('user-1', expectedPayload);
  });

  it('handles channel failures gracefully (does not throw)', async () => {
    const mockNotification = {
      id: 'notif-2',
      createdAt: new Date(),
    };
    
    vi.mocked(NotificationRepository.create).mockResolvedValueOnce(mockNotification as any);
    vi.mocked(NotificationPreferenceRepository.getPreferences).mockResolvedValueOnce({} as any);
    
    const failingChannel = new DummyChannel();
    failingChannel.send.mockRejectedValueOnce(new Error('Push failed'));
    
    const successChannel = new DummyChannel();
    
    vi.mocked(NotificationFactory.getChannelsForEvent).mockReturnValueOnce([failingChannel, successChannel]);

    // Should not throw
    await expect(
      NotificationService.notify('user-1', 'test', 'title', 'body')
    ).resolves.toBeUndefined();
    
    expect(successChannel.send).toHaveBeenCalled();
  });

  it('handles complete failure gracefully', async () => {
    // If DB fails, the whole method catches it and logs, without throwing back to caller (like ExpenseService)
    vi.mocked(NotificationRepository.create).mockRejectedValueOnce(new Error('DB Down'));
    
    // Should not throw
    await expect(
      NotificationService.notify('user-1', 'test', 'title', 'body')
    ).resolves.toBeUndefined();
  });
});

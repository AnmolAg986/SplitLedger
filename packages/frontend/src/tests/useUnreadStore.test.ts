import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUnreadStore } from '../shared/store/useUnreadStore';
import { apiClient } from '../shared/api/axios';

vi.mock('../shared/api/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

describe('useUnreadStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUnreadStore.setState({ counts: [] });
    vi.clearAllMocks();
  });

  it('fetchCounts should update counts from API', async () => {
    const mockData = [{ entity_type: 'group', entity_id: 'g1', section: 'chat', count: 3 }];
    (apiClient.get as any).mockResolvedValueOnce({ data: mockData });

    await useUnreadStore.getState().fetchCounts();

    expect(apiClient.get).toHaveBeenCalledWith('/unread');
    expect(useUnreadStore.getState().counts).toEqual(mockData);
  });

  it('handleUpdate should add new count if it does not exist', () => {
    useUnreadStore.getState().handleUpdate({
      entity_type: 'friend',
      entity_id: 'f1',
      section: 'expenses',
      delta: 1
    });

    const state = useUnreadStore.getState();
    expect(state.counts).toHaveLength(1);
    expect(state.counts[0]).toEqual({
      entity_type: 'friend',
      entity_id: 'f1',
      section: 'expenses',
      count: 1
    });
  });

  it('handleUpdate should increment existing count', () => {
    useUnreadStore.setState({
      counts: [{ entity_type: 'friend', entity_id: 'f1', section: 'expenses', count: 2 }]
    });

    useUnreadStore.getState().handleUpdate({
      entity_type: 'friend',
      entity_id: 'f1',
      section: 'expenses',
      delta: 3
    });

    expect(useUnreadStore.getState().counts[0].count).toBe(5);
  });

  it('markAsRead should call API and remove count locally', async () => {
    useUnreadStore.setState({
      counts: [
        { entity_type: 'friend', entity_id: 'f1', section: 'expenses', count: 2 },
        { entity_type: 'group', entity_id: 'g1', section: 'chat', count: 1 }
      ]
    });

    (apiClient.post as any).mockResolvedValueOnce({});

    await useUnreadStore.getState().markAsRead('friend', 'f1', 'expenses');

    expect(apiClient.post).toHaveBeenCalledWith('/unread/read', {
      entityType: 'friend',
      entityId: 'f1',
      section: 'expenses'
    });

    const counts = useUnreadStore.getState().counts;
    expect(counts).toHaveLength(1);
    expect(counts[0].entity_type).toBe('group');
  });

  it('getSectionCount, getEntityCount, getPageCount should aggregate correctly', () => {
    useUnreadStore.setState({
      counts: [
        { entity_type: 'group', entity_id: 'g1', section: 'chat', count: 2 },
        { entity_type: 'group', entity_id: 'g1', section: 'expenses', count: 3 },
        { entity_type: 'group', entity_id: 'g2', section: 'chat', count: 5 },
        { entity_type: 'friend', entity_id: 'f1', section: 'expenses', count: 1 },
      ]
    });

    const store = useUnreadStore.getState();

    expect(store.getSectionCount('group', 'g1', 'chat')).toBe(2);
    expect(store.getEntityCount('group', 'g1')).toBe(5); // 2 + 3
    expect(store.getPageCount('group')).toBe(10); // 2 + 3 + 5
    expect(store.getTotalActivityCount()).toBe(11); // 10 + 1
  });
});

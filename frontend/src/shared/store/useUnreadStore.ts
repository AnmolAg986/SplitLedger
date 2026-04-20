import { create } from 'zustand';
import { apiClient } from '../api/axios';

export interface UnreadCount {
  entity_type: 'friend' | 'group' | 'global';
  entity_id: string | null;
  section: string;
  count: number;
}

interface UnreadState {
  counts: UnreadCount[];
  fetchCounts: () => Promise<void>;
  markAsRead: (entityType: string, entityId: string | null, section: string) => Promise<void>;
  handleUpdate: (update: { entity_type: string, entity_id: string | null, section: string, delta: number }) => void;
  getSectionCount: (entityType: string, entityId: string | null, section: string) => number;
  getEntityCount: (entityType: string, entityId: string | null) => number;
  getPageCount: (entityType: string) => number;
  getTotalActivityCount: () => number;
}

export const useUnreadStore = create<UnreadState>((set, get) => ({
  counts: [],
  fetchCounts: async () => {
    try {
      const res = await apiClient.get('/unread');
      set({ counts: res.data });
    } catch (e) {
      console.error('Failed to fetch unread counts', e);
    }
  },
  markAsRead: async (entityType, entityId, section) => {
    try {
      await apiClient.post('/unread/read', { entityType, entityId, section });
      set((state) => ({
        counts: state.counts.filter(
          c => !(c.entity_type === entityType && c.entity_id === entityId && c.section === section)
        )
      }));
    } catch (e) {
      console.error('Failed to mark unread as read', e);
    }
  },
  handleUpdate: (update) => {
    set((state) => {
      const existing = state.counts.find(
        c => c.entity_type === update.entity_type && c.entity_id === update.entity_id && c.section === update.section
      );
      if (existing) {
        return {
          counts: state.counts.map(c => 
            c === existing ? { ...c, count: c.count + update.delta } : c
          )
        };
      } else {
        return {
          counts: [...state.counts, {
            entity_type: update.entity_type as any,
            entity_id: update.entity_id,
            section: update.section,
            count: update.delta
          }]
        };
      }
    });
  },
  getSectionCount: (entityType, entityId, section) => {
    const c = get().counts.find(c => c.entity_type === entityType && c.entity_id === entityId && c.section === section);
    return c ? c.count : 0;
  },
  getEntityCount: (entityType, entityId) => {
    return get().counts
      .filter(c => c.entity_type === entityType && c.entity_id === entityId)
      .reduce((acc, c) => acc + c.count, 0);
  },
  getPageCount: (entityType) => {
    return get().counts
      .filter(c => c.entity_type === entityType)
      .reduce((acc, c) => acc + c.count, 0);
  },
  getTotalActivityCount: () => {
    // Activity page superset of all events
    return get().counts.reduce((acc, c) => acc + c.count, 0);
  }
}));

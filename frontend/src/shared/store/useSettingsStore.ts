import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  mutedUserIds: string[];
  toggleMute: (userId: string) => void;
  isMuted: (userId: string) => boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      mutedUserIds: [],
      
      toggleMute: (userId: string) => set((state) => {
        const isCurrentlyMuted = state.mutedUserIds.includes(userId);
        if (isCurrentlyMuted) {
          return { mutedUserIds: state.mutedUserIds.filter(id => id !== userId) };
        } else {
          return { mutedUserIds: [...state.mutedUserIds, userId] };
        }
      }),
      
      isMuted: (userId: string) => get().mutedUserIds.includes(userId),
    }),
    {
      name: 'splitledger-settings-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

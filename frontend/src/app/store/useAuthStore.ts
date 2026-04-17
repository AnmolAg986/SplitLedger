import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      
      setAuth: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      
      logout: () => set({ user: null, accessToken: null, refreshToken: null })
    }),
    {
      name: 'splitledger-auth-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);

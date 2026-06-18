import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  avatarUrl?: string;
  twoFactorEnabled: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  propertyId: string;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, totpCode?: string) => Promise<any>;
  logout: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
  setPropertyId: (id: string) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      propertyId: 'demo-property-id',
      isLoading: false,
      error: null,

      login: async (email, password, totpCode) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/v1/auth/login', { email, password, totpCode });
          const { accessToken, refreshToken, user, requiresTwoFactor } = response.data;

          if (requiresTwoFactor) {
            set({ isLoading: false });
            return { requiresTwoFactor: true };
          }

          set({ user, accessToken, refreshToken, isLoading: false });
          return { success: true };
        } catch (error: any) {
          const message = error.response?.data?.message || 'Login failed. Please try again.';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) {
            await api.post('/v1/auth/logout', { refreshToken });
          }
        } finally {
          set({ user: null, accessToken: null, refreshToken: null });
        }
      },

      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),
      setPropertyId: (id) => set({ propertyId: id }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'mgh-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        propertyId: state.propertyId,
      }),
    },
  ),
);

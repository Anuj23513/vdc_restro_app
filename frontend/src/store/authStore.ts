import { create } from 'zustand';
import { User } from '../types';
import { authService } from '../services/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setToken: (token) => set({ token }),

  login: async (email, password) => {
    try {
      const response = await authService.login(email, password);
      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  register: async (email, password, name, phone) => {
    try {
      const response = await authService.register(email, password, name, phone);
      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  logout: async () => {
    await authService.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await authService.getStoredToken();
      const user = await authService.getStoredUser();
      
      if (token && user) {
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      set({ isLoading: false });
    }
  },
}));
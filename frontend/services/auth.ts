import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthResponse } from '../types';

export const authService = {
  async register(email: string, password: string, name: string, phone: string) {
    const response = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
      phone,
      role: 'customer',
    });
    
    await AsyncStorage.setItem('auth_token', response.data.access_token);
    await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
    
    return response.data;
  },

  async login(email: string, password: string) {
    const response = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    
    await AsyncStorage.setItem('auth_token', response.data.access_token);
    await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
    
    return response.data;
  },

  async logout() {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_data');
  },

  async getCurrentUser() {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  async getStoredUser(): Promise<User | null> {
    const userData = await AsyncStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  },

  async getStoredToken(): Promise<string | null> {
    return await AsyncStorage.getItem('auth_token');
  },
};
// User API Service
import { apiClient, APIResponse } from './apiClient';
import { API_ENDPOINTS } from './config';
import { User } from '../types';

export interface UserSettings {
  theme: string;
  units: string;
  notifications_enabled: boolean;
  data_privacy_analytics: boolean;
}

export const userService = {
  async getProfile(): Promise<APIResponse<User>> {
    return apiClient.get<User>(API_ENDPOINTS.USER.PROFILE);
  },

  async updateProfile(userData: Partial<User>): Promise<APIResponse<User>> {
    return apiClient.put<User>(API_ENDPOINTS.USER.UPDATE_PROFILE, userData);
  },

  async getSettings(): Promise<APIResponse<UserSettings>> {
    return apiClient.get<UserSettings>(API_ENDPOINTS.USER.SETTINGS);
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<APIResponse<UserSettings>> {
    return apiClient.put<UserSettings>(API_ENDPOINTS.USER.UPDATE_SETTINGS, settings);
  },
};

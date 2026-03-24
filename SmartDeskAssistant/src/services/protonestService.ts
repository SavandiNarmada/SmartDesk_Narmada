import { apiClient, APIResponse } from './apiClient';
import { API_ENDPOINTS } from './config';
import { ProtonestCredentials } from '../types';

export const protonestService = {
  async saveCredentials(protonestEmail: string, password: string): Promise<APIResponse<ProtonestCredentials>> {
    return apiClient.post(API_ENDPOINTS.PROTONEST.SAVE_CREDENTIALS, { protonestEmail, password });
  },

  async getCredentials(): Promise<APIResponse<ProtonestCredentials>> {
    return apiClient.get(API_ENDPOINTS.PROTONEST.GET_CREDENTIALS);
  },

  async deleteCredentials(): Promise<APIResponse> {
    return apiClient.delete(API_ENDPOINTS.PROTONEST.DELETE_CREDENTIALS);
  },

  async testConnection(): Promise<APIResponse> {
    return apiClient.post(API_ENDPOINTS.PROTONEST.TEST_CONNECTION);
  },

  async triggerSync(): Promise<APIResponse> {
    return apiClient.post(API_ENDPOINTS.PROTONEST.SYNC);
  },
};

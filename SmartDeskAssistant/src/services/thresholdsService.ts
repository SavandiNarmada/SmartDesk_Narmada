import { apiClient, APIResponse } from './apiClient';
import { API_ENDPOINTS } from './config';
import { SensorThresholds } from '../types';

export const thresholdsService = {
  async getThresholds(): Promise<APIResponse<SensorThresholds>> {
    return apiClient.get(API_ENDPOINTS.THRESHOLDS.GET);
  },

  async updateThresholds(updates: Partial<SensorThresholds>): Promise<APIResponse<SensorThresholds>> {
    return apiClient.put(API_ENDPOINTS.THRESHOLDS.UPDATE, updates);
  },

  async resetThresholds(): Promise<APIResponse<SensorThresholds>> {
    return apiClient.post(API_ENDPOINTS.THRESHOLDS.RESET);
  },
};

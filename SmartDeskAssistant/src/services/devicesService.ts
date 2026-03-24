// Devices API Service
import { apiClient, APIResponse } from './apiClient';
import { API_ENDPOINTS } from './config';
import { Device, NewDevice, SensorReading } from '../types';

export const devicesService = {
  async getDevices(): Promise<APIResponse<Device[]>> {
    return apiClient.get<Device[]>(API_ENDPOINTS.DEVICES.LIST);
  },

  async createDevice(device: NewDevice): Promise<APIResponse<Device>> {
    return apiClient.post<Device>(API_ENDPOINTS.DEVICES.CREATE, device);
  },

  async updateDevice(id: string, device: Partial<Device>): Promise<APIResponse<Device>> {
    return apiClient.put<Device>(API_ENDPOINTS.DEVICES.UPDATE(id), device);
  },

  async deleteDevice(id: string): Promise<APIResponse> {
    return apiClient.delete(API_ENDPOINTS.DEVICES.DELETE(id));
  },

  async getDeviceReadings(id: string, hours?: number): Promise<APIResponse<SensorReading[]>> {
    const endpoint = hours 
      ? `${API_ENDPOINTS.DEVICES.READINGS(id)}?hours=${hours}`
      : API_ENDPOINTS.DEVICES.READINGS(id);
    
    return apiClient.get<SensorReading[]>(endpoint);
  },

  async createDeviceReading(
    id: string,
    reading: Omit<SensorReading, 'id' | 'deviceId' | 'timestamp'>
  ): Promise<APIResponse<SensorReading>> {
    return apiClient.post<SensorReading>(
      API_ENDPOINTS.DEVICES.READINGS(id),
      reading
    );
  },
};

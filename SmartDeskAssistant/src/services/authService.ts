// Authentication API Service
import { apiClient, APIResponse } from './apiClient';
import { API_ENDPOINTS } from './config';
import { User, RegisterData } from '../types';

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export const authService = {
  async login(data: LoginData): Promise<APIResponse<AuthResponse>> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      data
    );
    
    // Store token for future requests
    if (response.success && response.data?.token) {
      apiClient.setToken(response.data.token);
      if (response.data.refreshToken) {
        apiClient.setRefreshToken(response.data.refreshToken);
      }
    }
    
    return response;
  },

  async register(data: RegisterData): Promise<APIResponse<AuthResponse>> {
    const registerPayload = {
      email: data.email,
      password: data.password,
      full_name: data.fullName,
    };
    
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      registerPayload
    );
    
    // Store token for future requests
    if (response.success && response.data?.token) {
      apiClient.setToken(response.data.token);
      if (response.data.refreshToken) {
        apiClient.setRefreshToken(response.data.refreshToken);
      }
    }
    
    return response;
  },

  async logout(): Promise<APIResponse> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    
    // Clear token
    apiClient.setToken(null);
    
    return response;
  },

  async refreshToken(refreshToken: string): Promise<APIResponse<{ token: string; refreshToken: string }>> {
    const response = await apiClient.post<{ token: string; refreshToken: string }>(
      API_ENDPOINTS.AUTH.REFRESH_TOKEN,
      { refreshToken }
    );
    
    // Store new token for future requests
    if (response.success && response.data?.token) {
      apiClient.setToken(response.data.token);
    }
    
    return response;
  },

  async updateProfile(userData: any): Promise<APIResponse<User>> {
    return apiClient.put<User>(API_ENDPOINTS.USER.UPDATE_PROFILE, userData);
  },

  setToken(token: string | null) {
    apiClient.setToken(token);
  },
};

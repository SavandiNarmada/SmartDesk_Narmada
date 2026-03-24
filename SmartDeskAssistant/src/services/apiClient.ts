// API Client for Smart Desk Assistant
import { API_BASE_URL, API_ENDPOINTS } from './config';

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class APIError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'APIError';
  }
}

class APIClient {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<any> | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  setRefreshToken(refreshToken: string | null) {
    this.refreshToken = refreshToken;
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new APIError('No refresh token available', 401);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new APIError(data.error || 'Token refresh failed', response.status);
      }

      if (data.success && data.data) {
        this.token = data.data.token;
        this.refreshToken = data.data.refreshToken;
      }
    } catch (error) {
      // Clear tokens on refresh failure
      this.token = null;
      this.refreshToken = null;
      throw error;
    }
  }

  private async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<APIResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add auth token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // If we get a 401 and haven't tried refreshing yet, attempt to refresh token
      if (response.status === 401 && retryCount === 0 && this.refreshToken) {
        try {
          await this.refreshAccessToken();
          // Retry the original request with new token
          return this.requestWithRetry<T>(endpoint, options, retryCount + 1);
        } catch (refreshError) {
          // Refresh failed, return original error
          throw new APIError(
            data.error || 'Authentication failed',
            response.status
          );
        }
      }

      if (!response.ok) {
        throw new APIError(
          data.error || 'Request failed',
          response.status
        );
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      // Network or other errors
      throw new APIError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  async get<T>(endpoint: string): Promise<APIResponse<T>> {
    return this.requestWithRetry<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.requestWithRetry<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.requestWithRetry<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<APIResponse<T>> {
    return this.requestWithRetry<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new APIClient();

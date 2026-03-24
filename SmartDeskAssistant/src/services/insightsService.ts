// Insights API Service
import { apiClient, APIResponse } from './apiClient';
import { API_ENDPOINTS } from './config';
import { Insight } from '../types';

// The API returns color as a string (e.g. 'rgba(76, 175, 80, 1)').
// react-native-chart-kit requires color as a function (opacity) => string.
// We expose both the raw API shape and a chart-compatible shape.
export interface RecentReading {
  value: number;
  timestamp: string;
}

export interface ReportDataRaw {
  labels: string[];
  datasets: Array<{
    data: number[];
    color: string;        // returned as a string from the API
    strokeWidth: number;
  }>;
  stats: {
    average: number;
    min: number;
    max: number;
    count: number;
  };
  recentReadings?: RecentReading[];
}

// Shape that react-native-chart-kit needs
export interface ReportData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color: (opacity?: number) => string;
    strokeWidth: number;
  }>;
  stats: {
    average: number;
    min: number;
    max: number;
    count: number;
  };
  recentReadings?: RecentReading[];
}

// Convert the API response color string to a chart-compatible color function
function rawToChartData(raw: ReportDataRaw): ReportData {
  return {
    ...raw,
    datasets: raw.datasets.map((ds) => ({
      ...ds,
      color: (opacity = 1) => {
        // Substitute the opacity into the RGBA string from the API.
        // Supports 'rgba(r, g, b, 1)' format. Falls back gracefully for other formats.
        if (typeof ds.color === 'string' && ds.color.startsWith('rgba(')) {
          return ds.color.replace(/,\s*[\d.]+\)$/, `, ${opacity})`);
        }
        return `rgba(158, 158, 158, ${opacity})`;
      },
    })),
  };
}

export const insightsService = {
  async getInsights(limit?: number): Promise<APIResponse<Insight[]>> {
    const endpoint = limit 
      ? `${API_ENDPOINTS.INSIGHTS.LIST}?limit=${limit}`
      : API_ENDPOINTS.INSIGHTS.LIST;
    
    return apiClient.get<Insight[]>(endpoint);
  },

  async getInsightsByDevice(deviceId: string, limit?: number): Promise<APIResponse<Insight[]>> {
    const endpoint = limit
      ? `${API_ENDPOINTS.INSIGHTS.BY_DEVICE(deviceId)}?limit=${limit}`
      : API_ENDPOINTS.INSIGHTS.BY_DEVICE(deviceId);
    
    return apiClient.get<Insight[]>(endpoint);
  },

  async getLatestInsight(): Promise<APIResponse<Insight | null>> {
    return apiClient.get<Insight | null>(API_ENDPOINTS.INSIGHTS.LATEST);
  },

  async getReports(timeRange?: string, metric?: string): Promise<APIResponse<ReportData>> {
    const params = new URLSearchParams();
    if (timeRange) params.append('timeRange', timeRange);
    if (metric) params.append('metric', metric);
    
    const endpoint = params.toString() 
      ? `${API_ENDPOINTS.INSIGHTS.REPORTS}?${params.toString()}`
      : API_ENDPOINTS.INSIGHTS.REPORTS;
    
    const response = await apiClient.get<ReportDataRaw>(endpoint);
    if (response.success && response.data) {
      return {
        ...response,
        data: rawToChartData(response.data),
      } as APIResponse<ReportData>;
    }
    return response as unknown as APIResponse<ReportData>;
  },

  async createInsight(insight: Omit<Insight, 'id' | 'timestamp'>): Promise<APIResponse<Insight>> {
    return apiClient.post<Insight>(API_ENDPOINTS.INSIGHTS.LIST, insight);
  },

  async getAITips(deviceId: string): Promise<APIResponse<Insight>> {
    return apiClient.post<Insight>(API_ENDPOINTS.INSIGHTS.AI_TIPS(deviceId));
  },
};

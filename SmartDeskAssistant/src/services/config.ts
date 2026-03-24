// API Configuration for Smart Desk Assistant
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Auto-detect the dev server IP from Expo — no more manual IP changes!
// Expo injects the debuggerHost (e.g. "192.168.1.5:8081") into every session.
// We extract just the IP part and use it to reach the backend on port 3000.
function getDevServerHost(): string {
  // Web browser: use the current page's hostname (works for localhost or any IP)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.hostname;
  }

  // Expo Go / dev build: extract IP from Expo's debuggerHost
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost;

  if (debuggerHost) {
    const host = debuggerHost.split(':')[0]; // "192.168.1.5:8081" → "192.168.1.5"
    if (host) return host;
  }

  // Fallback — should rarely be needed
  return 'localhost';
}

const BACKEND_PORT = 3000;
const DEV_HOST = getDevServerHost();

// Development vs Production API URL
// In dev: auto-detected from Expo's dev server IP — works on any WiFi network
// In prod: uses the production domain
export const API_BASE_URL = __DEV__
  ? `http://${DEV_HOST}:${BACKEND_PORT}/api`
  : 'http://savindi.autohubmarket.com/api';

// WebSocket URL for real-time sensor data
export const WS_URL = __DEV__
  ? `ws://${DEV_HOST}:${BACKEND_PORT}/ws`
  : 'ws://savindi.autohubmarket.com/ws';

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    REFRESH_TOKEN: '/auth/refresh',
  },
  DEVICES: {
    LIST: '/devices',
    CREATE: '/devices',
    UPDATE: (id: string) => `/devices/${id}`,
    DELETE: (id: string) => `/devices/${id}`,
    READINGS: (id: string) => `/devices/${id}/readings`,
  },
  INSIGHTS: {
    LIST: '/insights',
    BY_DEVICE: (id: string) => `/insights/device/${id}`,
    LATEST: '/insights/latest',
    REPORTS: '/insights/reports',
    AI_TIPS: (id: string) => `/insights/ai-tips/${id}`,
  },
  PROTONEST: {
    SAVE_CREDENTIALS: '/protonest/credentials',
    GET_CREDENTIALS: '/protonest/credentials',
    DELETE_CREDENTIALS: '/protonest/credentials',
    TEST_CONNECTION: '/protonest/test',
    SYNC: '/protonest/sync',
  },
  THRESHOLDS: {
    GET: '/thresholds',
    UPDATE: '/thresholds',
    RESET: '/thresholds/reset',
  },
  USER: {
    PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/profile',
    SETTINGS: '/user/settings',
    UPDATE_SETTINGS: '/user/settings',
    PUSH_TOKEN: '/user/push-token',
  },
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};

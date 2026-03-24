// Constants for Smart Desk Assistant
import { ColorScheme, TimeRange } from '../types';

export const COLORS: ColorScheme = {
  primary: '#1565C0',      // Deep blue - strong brand color
  primaryDark: '#0D47A1',  // Darker blue for pressed states
  secondary: '#2E7D32',    // Deep green - success/positive
  accent: '#E65100',       // Deep orange - warnings
  error: '#C62828',        // Deep red - errors/critical
  warning: '#E65100',      // Deep orange - warnings
  info: '#1565C0',         // Blue - informational
  success: '#2E7D32',      // Deep green - success
  surface: '#FFFFFF',      // White - card backgrounds
  background: '#F5F5F5',   // Light gray - screen backgrounds
  onSurface: '#1A1A1A',    // Near-black - primary text
  onBackground: '#616161', // Medium gray - secondary text
  disabled: '#BDBDBD',     // Light gray - disabled
};

export const DARK_COLORS: ColorScheme = {
  primary: '#64B5F6',      // Light blue - readable on dark
  primaryDark: '#42A5F5',
  secondary: '#81C784',    // Light green on dark
  accent: '#FFB74D',       // Light orange on dark
  error: '#EF5350',        // Light red on dark
  warning: '#FFB74D',      // Light orange
  info: '#64B5F6',         // Light blue
  success: '#81C784',      // Light green
  surface: '#1E1E1E',      // Dark surface
  background: '#121212',   // Dark background
  onSurface: '#F5F5F5',    // Off-white - primary text on dark
  onBackground: '#9E9E9E', // Muted gray - secondary text on dark
  disabled: '#616161',     // Subtle disabled on dark
};

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
};

export const TYPOGRAPHY = {
  HEADLINE: {
    fontFamily: 'Roboto-Bold',
    fontSize: 28,
    lineHeight: 36,
  },
  TITLE: {
    fontFamily: 'Roboto-Medium',
    fontSize: 20,
    lineHeight: 28,
  },
  BODY: {
    fontFamily: 'Roboto-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  CAPTION: {
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  LABEL: {
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
};

export const BORDER_RADIUS = {
  CARD: 12,
  INPUT: 8,
  BUTTON: 8,
};

export const ELEVATION = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 4,
};

export const DEVICE_TYPES = [
  { label: 'Air Quality Sensor', value: 'air_quality' },
  { label: 'Light Sensor', value: 'light_sensor' },
  { label: 'Noise Meter', value: 'noise_meter' },
  { label: 'Multi Sensor', value: 'multi_sensor' },
];

export const TIME_RANGES: TimeRange[] = [
  { label: '1H', value: '1h', hours: 1 },
  { label: '24H', value: '24h', hours: 24 },
  { label: '7D', value: '7d', hours: 168 },
  { label: '30D', value: '30d', hours: 720 },
];

export const AQI_LEVELS = [
  { min: 0, max: 50, label: 'Good', color: '#2E7D32' },
  { min: 51, max: 100, label: 'Moderate', color: '#F57C00' },
  { min: 101, max: 150, label: 'Unhealthy for Sensitive', color: '#E64A19' },
  { min: 151, max: 200, label: 'Unhealthy', color: '#C62828' },
  { min: 201, max: 300, label: 'Very Unhealthy', color: '#7B1FA2' },
  { min: 301, max: 500, label: 'Hazardous', color: '#880E4F' },
];

export const NOISE_LEVELS = [
  { min: 0, max: 30, label: 'Very Quiet', color: '#2E7D32' },
  { min: 31, max: 40, label: 'Quiet', color: '#558B2F' },
  { min: 41, max: 60, label: 'Moderate', color: '#F57C00' },
  { min: 61, max: 80, label: 'Loud', color: '#D32F2F' },
  { min: 81, max: 110, label: 'Very Loud', color: '#7B1FA2' },
  { min: 111, max: 200, label: 'Dangerous', color: '#880E4F' },
];

export const LIGHT_LEVELS = [
  { min: 0, max: 50, label: 'Too Dark', color: '#C62828' },
  { min: 51, max: 200, label: 'Dim', color: '#F57C00' },
  { min: 201, max: 500, label: 'Good', color: '#2E7D32' },
  { min: 501, max: 1000, label: 'Bright', color: '#F57C00' },
  { min: 1001, max: 10000, label: 'Too Bright', color: '#C62828' },
];

export const REFRESH_INTERVALS = {
  DASHBOARD: 5000, // 5 seconds
  REPORTS: 60000,   // 1 minute
  INSIGHTS: 300000, // 5 minutes
};

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
    UPDATE: '/devices/:id',
    DELETE: '/devices/:id',
    READINGS: '/devices/:id/readings',
  },
  INSIGHTS: {
    LIST: '/insights',
    BY_DEVICE: '/insights/device/:id',
    LATEST: '/insights/latest',
  },
  USER: {
    PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/profile',
    SETTINGS: '/user/settings',
  },
};

export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  DEVICE_NAME_MAX_LENGTH: 50,
  DEVICE_NAME_MIN_LENGTH: 3,
};

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

export const SCREEN_NAMES = {
  // Auth
  SPLASH: 'Splash',
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  
  // Main Navigation
  DEVICES_TAB: 'DevicesTab',
  REPORTS_TAB: 'ReportsTab',
  INSIGHTS_TAB: 'InsightsTab',
  PROFILE_TAB: 'ProfileTab',
  
  // Devices Stack
  DEVICES_LIST: 'DevicesList',
  ADD_EDIT_DEVICE: 'AddEditDevice',
  DEVICE_DASHBOARD: 'DeviceDashboard',
  
  // Reports Stack
  REPORTS: 'Reports',
  REPORT_DETAILS: 'ReportDetails',
  
  // Insights Stack
  INSIGHTS: 'Insights',
  INSIGHT_DETAILS: 'InsightDetails',
  
  // Profile Stack
  PROFILE: 'Profile',
  EDIT_PROFILE: 'EditProfile',
  SETTINGS: 'Settings',
  PROTONEST_SETUP: 'ProtonestSetup',
  THRESHOLD_SETTINGS: 'ThresholdSettings',
};
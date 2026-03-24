// Type definitions for Smart Desk Assistant

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  timezone?: string;
  avatar?: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  location: string;
  status: DeviceStatus;
  batteryLevel?: number;
  deviceKey?: string;
  protonestDeviceId?: string;
  lastReading?: SensorReading;
  wifiSettings?: WifiSettings;
  notificationPreferences: NotificationPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface NewDevice {
  name: string;
  type: DeviceType;
  location: string;
  protonestDeviceId?: string;
  wifiSettings?: WifiSettings;
  notificationPreferences: NotificationPreferences;
}

export interface SensorReading {
  id: string;
  deviceId: string;
  timestamp: string;
  airQuality?: number; // AQI value
  lightLevel?: number; // Lux value
  noiseLevel?: number; // dB value
  temperature?: number; // Celsius
  humidity?: number; // Percentage
}

export interface Insight {
  id: string;
  deviceId: string;
  type: InsightType;
  title: string;
  description: string;
  severity: InsightSeverity;
  timestamp: string;
  source?: 'threshold' | 'ai';
  actionable: boolean;
  actions?: string[];
}

export type DeviceType = 'air_quality' | 'light_sensor' | 'noise_meter' | 'multi_sensor';

export type DeviceStatus = 'online' | 'offline' | 'connecting' | 'error';

export type InsightType = 'air_quality' | 'lighting' | 'noise' | 'productivity' | 'health' | 'ai_recommendation';

export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface WifiSettings {
  ssid: string;
  password: string;
  autoConnect: boolean;
}

export interface NotificationPreferences {
  threshold_alerts: boolean;
  daily_summary: boolean;
  weekly_report: boolean;
  device_offline: boolean;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface DevicesState {
  devices: Device[];
  selectedDevice: Device | null;
  isLoading: boolean;
  error: string | null;
}

export interface ThemeState {
  isDarkMode: boolean;
  colors: ColorScheme;
}

export interface ColorScheme {
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  error: string;
  warning: string;
  info: string;
  success: string;
  surface: string;
  background: string;
  onSurface: string;
  onBackground: string;
  disabled: string;
}

export interface ChartDataPoint {
  x: number | string;
  y: number;
  label?: string;
}

export interface TimeRange {
  label: string;
  value: string;
  hours: number;
}

export interface ProtonestCredentials {
  connected: boolean;
  email?: string;
  tokenValid?: boolean;
}

export interface SensorThresholds {
  aqi_excellent_max: number;
  aqi_good_max: number;
  aqi_moderate_max: number;
  light_low_min: number;
  light_good_min: number;
  light_good_max: number;
  light_bright_max: number;
  noise_quiet_max: number;
  noise_moderate_max: number;
  noise_loud_max: number;
  temp_cold_max: number;
  temp_good_min: number;
  temp_good_max: number;
  temp_hot_min: number;
  humidity_dry_max: number;
  humidity_good_min: number;
  humidity_good_max: number;
  humidity_wet_min: number;
  offset_air_quality: number;
  offset_light_level: number;
  offset_noise_level: number;
  offset_temperature: number;
  offset_humidity: number;
}

export interface RoomCondition {
  score: number;
  label: string;
  color: string;
  breakdown: {
    airQuality: { score: number; label: string; color: string };
    lightLevel: { score: number; label: string; color: string };
    noiseLevel: { score: number; label: string; color: string };
    temperature: { score: number; label: string; color: string };
    humidity: { score: number; label: string; color: string };
  };
}

export const DEFAULT_THRESHOLDS: SensorThresholds = {
  aqi_excellent_max: 50,
  aqi_good_max: 100,
  aqi_moderate_max: 150,
  light_low_min: 50,
  light_good_min: 300,
  light_good_max: 500,
  light_bright_max: 2000,
  noise_quiet_max: 35,
  noise_moderate_max: 50,
  noise_loud_max: 70,
  temp_cold_max: 18,
  temp_good_min: 20,
  temp_good_max: 26,
  temp_hot_min: 30,
  humidity_dry_max: 30,
  humidity_good_min: 40,
  humidity_good_max: 60,
  humidity_wet_min: 70,
  offset_air_quality: 0,
  offset_light_level: 0,
  offset_noise_level: 0,
  offset_temperature: 0,
  offset_humidity: 0,
};
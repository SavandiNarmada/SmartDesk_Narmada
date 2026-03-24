// Type definitions for Smart Desk Assistant Backend

export interface User {
  id: string;
  email: string;
  password_hash?: string;
  full_name: string;
  phone_number?: string;
  timezone?: string;
  avatar?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface RegisterData {
  full_name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface Device {
  id: string;
  user_id: string;
  name: string;
  type: DeviceType;
  location: string;
  status: DeviceStatus;
  battery_level?: number;
  device_key?: string;
  protonest_device_id?: string;
  wifi_ssid?: string;
  wifi_auto_connect?: boolean;
  notification_threshold_alerts?: boolean;
  notification_daily_summary?: boolean;
  notification_weekly_report?: boolean;
  notification_device_offline?: boolean;
  created_at?: Date;
  updated_at?: Date;
  lastReading?: SensorReading;
}

export interface SensorReading {
  id: string;
  device_id: string;
  timestamp: Date;
  air_quality?: number;
  light_level?: number;
  noise_level?: number;
  temperature?: number;
  humidity?: number;
}

export interface Insight {
  id: string;
  device_id: string;
  type: InsightType;
  title: string;
  description: string;
  severity: InsightSeverity;
  actionable: boolean;
  actions?: string[];
  timestamp: Date;
  source?: 'threshold' | 'ai';
}

export type DeviceType = 'air_quality' | 'light_sensor' | 'noise_meter' | 'multi_sensor';
export type DeviceStatus = 'online' | 'offline' | 'connecting' | 'error';
export type InsightType = 'air_quality' | 'lighting' | 'noise' | 'productivity' | 'health' | 'ai_recommendation';
export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  theme: string;
  units: string;
  notifications_enabled: boolean;
  data_privacy_analytics: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface TimeRangeParams {
  start?: string;
  end?: string;
  hours?: number;
}

export interface ProtonestCredentials {
  id: string;
  user_id: string;
  protonest_email: string;
  protonest_secret_key: string;
  jwt_token?: string;
  refresh_token?: string;
  jwt_expires_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface SensorThresholds {
  id: string;
  user_id: string;
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
  created_at?: Date;
  updated_at?: Date;
}

export const DEFAULT_THRESHOLDS: Omit<SensorThresholds, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
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

export interface ProtonestStreamRecord {
  id: string;
  deviceId: string;
  topicSuffix: string;
  payload: string;
  timestamp: string;
}

export interface ProtonestStateRecord {
  id: string;
  deviceId: string;
  topicSuffix: string;
  payload: string;
  timestamp: string;
}

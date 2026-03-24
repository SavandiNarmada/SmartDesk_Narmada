-- Smart Desk Assistant Database Schema
-- PostgreSQL Database Schema

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    timezone VARCHAR(100) DEFAULT 'UTC',
    avatar VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('air_quality', 'light_sensor', 'noise_meter', 'multi_sensor')),
    location VARCHAR(255) NOT NULL,
    status VARCHAR(32) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'connecting', 'error')),
    battery_level INT,
    device_key VARCHAR(64) UNIQUE,
    wifi_ssid VARCHAR(255),
    wifi_auto_connect BOOLEAN DEFAULT TRUE,
    notification_threshold_alerts BOOLEAN DEFAULT TRUE,
    notification_daily_summary BOOLEAN DEFAULT TRUE,
    notification_weekly_report BOOLEAN DEFAULT FALSE,
    notification_device_offline BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_device_key ON devices(device_key);

-- Sensor Readings Table
CREATE TABLE IF NOT EXISTS sensor_readings (
    id VARCHAR(36) PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    air_quality NUMERIC(5,2),
    light_level NUMERIC(8,2),
    noise_level NUMERIC(5,2),
    temperature NUMERIC(4,2),
    humidity NUMERIC(5,2),
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_id ON sensor_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings(timestamp);

-- Insights Table
CREATE TABLE IF NOT EXISTS insights (
    id VARCHAR(36) PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('air_quality', 'lighting', 'noise', 'productivity', 'health')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(32) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    actionable BOOLEAN DEFAULT FALSE,
    actions JSONB,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_insights_device_id ON insights(device_id);
CREATE INDEX IF NOT EXISTS idx_insights_timestamp ON insights(timestamp);
CREATE INDEX IF NOT EXISTS idx_insights_severity ON insights(severity);

-- Sessions Table (for JWT refresh tokens)
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE NOT NULL,
    theme VARCHAR(20) DEFAULT 'light',
    units VARCHAR(20) DEFAULT 'metric',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    data_privacy_analytics BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_devices_set_updated_at ON devices;
CREATE TRIGGER trg_devices_set_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_settings_set_updated_at ON user_settings;
CREATE TRIGGER trg_user_settings_set_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Protonest Connect Integration
-- ============================================================

-- Protonest Connect Credentials Table (one per user)
CREATE TABLE IF NOT EXISTS protonest_credentials (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE NOT NULL,
    protonest_email VARCHAR(255) NOT NULL,
    protonest_secret_key TEXT NOT NULL,
    jwt_token TEXT,
    refresh_token TEXT,
    jwt_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_protonest_credentials_user_id ON protonest_credentials(user_id);

-- Sensor Thresholds Table (customizable per user for demo flexibility)
CREATE TABLE IF NOT EXISTS sensor_thresholds (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE NOT NULL,
    aqi_excellent_max NUMERIC DEFAULT 50,
    aqi_good_max NUMERIC DEFAULT 100,
    aqi_moderate_max NUMERIC DEFAULT 150,
    light_low_min NUMERIC DEFAULT 50,
    light_good_min NUMERIC DEFAULT 300,
    light_good_max NUMERIC DEFAULT 500,
    light_bright_max NUMERIC DEFAULT 2000,
    noise_quiet_max NUMERIC DEFAULT 35,
    noise_moderate_max NUMERIC DEFAULT 50,
    noise_loud_max NUMERIC DEFAULT 70,
    temp_cold_max NUMERIC DEFAULT 18,
    temp_good_min NUMERIC DEFAULT 20,
    temp_good_max NUMERIC DEFAULT 26,
    temp_hot_min NUMERIC DEFAULT 30,
    humidity_dry_max NUMERIC DEFAULT 30,
    humidity_good_min NUMERIC DEFAULT 40,
    humidity_good_max NUMERIC DEFAULT 60,
    humidity_wet_min NUMERIC DEFAULT 70,
    offset_air_quality NUMERIC DEFAULT 0,
    offset_light_level NUMERIC DEFAULT 0,
    offset_noise_level NUMERIC DEFAULT 0,
    offset_temperature NUMERIC DEFAULT 0,
    offset_humidity NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sensor_thresholds_user_id ON sensor_thresholds(user_id);

-- Add Protonest device ID column to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS protonest_device_id VARCHAR(100);

-- Add source column to insights table to distinguish threshold vs AI insights
ALTER TABLE insights ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'threshold';

-- Expand insights type CHECK to include ai_recommendation
ALTER TABLE insights DROP CONSTRAINT IF EXISTS insights_type_check;
ALTER TABLE insights ADD CONSTRAINT insights_type_check
    CHECK (type IN ('air_quality', 'lighting', 'noise', 'productivity', 'health', 'ai_recommendation'));

-- Triggers for new tables
DROP TRIGGER IF EXISTS trg_protonest_credentials_set_updated_at ON protonest_credentials;
CREATE TRIGGER trg_protonest_credentials_set_updated_at
BEFORE UPDATE ON protonest_credentials
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sensor_thresholds_set_updated_at ON sensor_thresholds;
CREATE TRIGGER trg_sensor_thresholds_set_updated_at
BEFORE UPDATE ON sensor_thresholds
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Push Notification Tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS push_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    expo_push_token VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- Notification log to avoid spamming (cooldown tracking)
CREATE TABLE IF NOT EXISTS notification_log (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(36) NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_device ON notification_log(user_id, device_id, sensor_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at);

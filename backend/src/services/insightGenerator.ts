import pool from '../config/database';
import { generateId } from '../utils/helpers';

const INSIGHT_DEDUP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

async function hasRecentInsight(deviceId: string, type: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - INSIGHT_DEDUP_WINDOW_MS);
  const [rows]: any = await pool.query(
    `SELECT id FROM insights WHERE device_id = ? AND type = ? AND timestamp >= ? LIMIT 1`,
    [deviceId, type, cutoff]
  );
  return rows.length > 0;
}

export async function generateAutoInsights(
  deviceId: string,
  rawAirQuality: number | string | null,
  rawLightLevel: number | string | null,
  rawNoiseLevel: number | string | null
): Promise<void> {
  // PostgreSQL NUMERIC columns return strings — convert to numbers
  const airQuality = rawAirQuality != null ? Number(rawAirQuality) : null;
  const lightLevel = rawLightLevel != null ? Number(rawLightLevel) : null;
  const noiseLevel = rawNoiseLevel != null ? Number(rawNoiseLevel) : null;
  // Air quality thresholds
  if (airQuality !== null) {
    let severity: 'info' | 'warning' | 'critical' | null = null;
    let title = '';
    let description = '';
    let actions: string[] = [];

    if (airQuality > 150) {
      severity = 'critical';
      title = 'Unhealthy Air Quality Detected';
      description = `Air quality index is ${airQuality.toFixed(0)} (Unhealthy). Immediate action is recommended.`;
      actions = ['Open windows for fresh air', 'Turn on air purifier', 'Take a break outside', 'Check HVAC filters'];
    } else if (airQuality > 100) {
      severity = 'warning';
      title = 'Moderate Air Quality Alert';
      description = `Air quality index is ${airQuality.toFixed(0)} (Unhealthy for Sensitive Groups).`;
      actions = ['Improve ventilation', 'Check for pollution sources', 'Consider an air purifier'];
    } else if (airQuality > 50) {
      severity = 'info';
      title = 'Acceptable Air Quality';
      description = `Air quality index is ${airQuality.toFixed(0)} (Moderate).`;
      actions = ['Monitor air quality trends'];
    }

    if (severity && !(await hasRecentInsight(deviceId, 'air_quality'))) {
      await pool.query(
        `INSERT INTO insights (id, device_id, type, title, description, severity, actionable, actions, source)
         VALUES (?, ?, 'air_quality', ?, ?, ?, ?, ?, 'threshold')`,
        [generateId(), deviceId, title, description, severity, true, JSON.stringify(actions)]
      );
    }
  }

  // Noise level thresholds
  if (noiseLevel !== null) {
    let severity: 'info' | 'warning' | 'critical' | null = null;
    let title = '';
    let description = '';
    let actions: string[] = [];

    if (noiseLevel > 80) {
      severity = 'critical';
      title = 'Very High Noise Level';
      description = `Noise level is ${noiseLevel.toFixed(0)} dB (Very Loud). Consider noise reduction measures.`;
      actions = ['Use noise-cancelling headphones', 'Identify noise source', 'Consider earplugs', 'Move to a quieter area'];
    } else if (noiseLevel > 60) {
      severity = 'warning';
      title = 'High Noise Level';
      description = `Noise level is ${noiseLevel.toFixed(0)} dB (Loud). May affect concentration.`;
      actions = ['Close windows/doors', 'Use noise-cancelling headphones', 'Schedule focused work for quieter times'];
    } else if (noiseLevel > 45) {
      severity = 'info';
      title = 'Moderate Noise Level';
      description = `Noise level is ${noiseLevel.toFixed(0)} dB (Moderate).`;
      actions = ['Use background music or white noise to mask distractions'];
    }

    if (severity && !(await hasRecentInsight(deviceId, 'noise'))) {
      await pool.query(
        `INSERT INTO insights (id, device_id, type, title, description, severity, actionable, actions, source)
         VALUES (?, ?, 'noise', ?, ?, ?, ?, ?, 'threshold')`,
        [generateId(), deviceId, title, description, severity, true, JSON.stringify(actions)]
      );
    }
  }

  // Light level thresholds
  if (lightLevel !== null) {
    let severity: 'info' | 'warning' | 'critical' | null = null;
    let title = '';
    let description = '';
    let actions: string[] = [];

    if (lightLevel < 50) {
      severity = 'warning';
      title = 'Insufficient Lighting';
      description = `Light level is ${lightLevel.toFixed(0)} lux (Very Dark). Recommended desk lighting is 300-500 lux.`;
      actions = ['Turn on desk lamp', 'Increase room lighting', 'Open blinds or curtains'];
    } else if (lightLevel < 200) {
      severity = 'info';
      title = 'Low Lighting Detected';
      description = `Light level is ${lightLevel.toFixed(0)} lux (Dim).`;
      actions = ['Add a desk lamp', 'Increase ambient lighting'];
    } else if (lightLevel > 950) {
      severity = 'warning';
      title = 'Excessive Brightness';
      description = `Light level is ${lightLevel.toFixed(0)} lux (Very Bright). May cause eye strain and reduce focus.`;
      actions = ['Use window blinds or curtains', 'Reposition desk lamp', 'Use an anti-glare screen protector', 'Reduce screen brightness'];
    }

    if (severity && !(await hasRecentInsight(deviceId, 'lighting'))) {
      await pool.query(
        `INSERT INTO insights (id, device_id, type, title, description, severity, actionable, actions, source)
         VALUES (?, ?, 'lighting', ?, ?, ?, ?, ?, 'threshold')`,
        [generateId(), deviceId, title, description, severity, true, JSON.stringify(actions)]
      );
    }
  }
}

import pool from '../config/database';
import { broadcastNotification } from './pushNotificationService';
import { generateAIInsight } from './aiInsightsService';

const MONITOR_INTERVAL_MS  = 2  * 60 * 1000;  // every 2 minutes
const AI_TIP_INTERVAL_MS   = 10 * 60 * 1000;  // every 10 minutes

// ─── Monitoring Status Notification (every 2 min) ────────

async function sendMonitoringUpdate(): Promise<void> {
  try {
    // Get latest reading across all active devices
    const [rows]: any = await pool.query(
      `SELECT d.name, d.location, d.status,
              sr.air_quality, sr.light_level, sr.noise_level,
              sr.temperature, sr.humidity, sr.timestamp
       FROM devices d
       LEFT JOIN sensor_readings sr ON sr.id = (
         SELECT id FROM sensor_readings
         WHERE device_id = d.id
         ORDER BY timestamp DESC LIMIT 1
       )
       WHERE d.status = 'online'
       LIMIT 1`
    );

    if (rows.length === 0) {
      await broadcastNotification(
        'SmartDesk is Watching',
        'Your Smart Desk Assistant is actively monitoring your environment. No active devices detected right now.',
        { type: 'monitoring_update' }
      );
      return;
    }

    const r = rows[0];
    const parts: string[] = [];

    if (r.air_quality  != null) parts.push(`AQI ${parseFloat(r.air_quality).toFixed(0)}`);
    if (r.noise_level  != null) parts.push(`Noise ${parseFloat(r.noise_level).toFixed(0)} dB`);
    if (r.light_level  != null) parts.push(`Light ${parseFloat(r.light_level).toFixed(0)} lux`);
    if (r.temperature  != null) parts.push(`Temp ${parseFloat(r.temperature).toFixed(1)}°C`);
    if (r.humidity     != null) parts.push(`Humidity ${parseFloat(r.humidity).toFixed(0)}%`);

    const summary = parts.length > 0 ? parts.join(' · ') : 'Readings pending';

    await broadcastNotification(
      'Environment Monitoring Active',
      `Smart Desk Assistant is tracking your workspace. ${summary}`,
      { type: 'monitoring_update' }
    );

    console.log('📲 Scheduled monitoring notification sent');
  } catch (err) {
    console.error('Scheduled monitoring notification failed:', err);
  }
}

// ─── AI Tip Notification (every 10 min) ──────────────────

async function sendScheduledAITip(): Promise<void> {
  try {
    // Pick first online device that has sensor data
    const [devices]: any = await pool.query(
      `SELECT d.id, d.user_id FROM devices d
       INNER JOIN sensor_readings sr ON sr.device_id = d.id
       WHERE d.status = 'online'
       GROUP BY d.id, d.user_id
       ORDER BY MAX(sr.timestamp) DESC
       LIMIT 1`
    );

    if (devices.length === 0) return;

    const insight = await generateAIInsight(devices[0].id, true);
    if (!insight) return;

    await broadcastNotification(
      `AI Tip: ${insight.title}`,
      insight.description || 'New workspace tip from Smart Desk Assistant.',
      { type: 'ai_tip_scheduled', deviceId: devices[0].id }
    );

    console.log('🤖 Scheduled AI tip notification sent');
  } catch (err) {
    console.error('Scheduled AI tip notification failed:', err);
  }
}

// ─── Start Scheduler ──────────────────────────────────────

export function startScheduledNotifications(): void {
  // Stagger start slightly so server is fully ready
  setTimeout(() => {
    sendMonitoringUpdate();
    setInterval(sendMonitoringUpdate, MONITOR_INTERVAL_MS);
    console.log('⏰ Scheduled monitoring notifications started (every 2 min)');
  }, 10000);

  setTimeout(() => {
    sendScheduledAITip();
    setInterval(sendScheduledAITip, AI_TIP_INTERVAL_MS);
    console.log('🤖 Scheduled AI tip notifications started (every 10 min)');
  }, 15000);
}

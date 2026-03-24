import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { generateId } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';
import { generateAIInsight } from '../services/aiInsightsService';
import { sendUserNotification } from '../services/pushNotificationService';

// The database client may auto-parse JSON columns into arrays/objects.
// This helper ensures we always get a parsed value regardless.
function parseActions(actions: any): string[] | null {
  if (!actions) return null;
  if (Array.isArray(actions)) return actions;
  if (typeof actions === 'string') {
    try { return JSON.parse(actions); } catch { return null; }
  }
  return null;
}

// Allowed metric column names (prevents SQL injection via query param).
// 'temperature' and 'humidity' are included for future sensor support (e.g. DHT22 add-on).
const ALLOWED_METRICS = new Set([
  'air_quality', 'light_level', 'noise_level', 'temperature', 'humidity'
]);

export async function getInsights(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;

    const [insights]: any = await pool.query(
      `SELECT i.* FROM insights i
       INNER JOIN devices d ON i.device_id = d.id
       WHERE d.user_id = ?
       ORDER BY i.timestamp DESC
       LIMIT ?`,
      [userId, limit]
    );

    const formattedInsights = insights.map((insight: any) => ({
      ...insight,
      actions: parseActions(insight.actions),
    }));

    res.json({
      success: true,
      data: formattedInsights
    });
  } catch (error) {
    next(error);
  }
}

export async function getInsightsByDevice(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const deviceId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 20;

    // Check if device belongs to user
    const [devices]: any = await pool.query(
      'SELECT id FROM devices WHERE id = ? AND user_id = ?',
      [deviceId, userId]
    );

    if (devices.length === 0) {
      throw new AppError('Device not found', 404);
    }

    const [insights]: any = await pool.query(
      `SELECT * FROM insights
       WHERE device_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [deviceId, limit]
    );

    const formattedInsights = insights.map((insight: any) => ({
      ...insight,
      actions: parseActions(insight.actions),
    }));

    res.json({
      success: true,
      data: formattedInsights
    });
  } catch (error) {
    next(error);
  }
}

export async function getLatestInsight(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const [insights]: any = await pool.query(
      `SELECT i.* FROM insights i
       INNER JOIN devices d ON i.device_id = d.id
       WHERE d.user_id = ?
       ORDER BY i.timestamp DESC
       LIMIT 1`,
      [userId]
    );

    if (insights.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }

    const insight = insights[0];
    insight.actions = parseActions(insight.actions);

    res.json({
      success: true,
      data: insight
    });
  } catch (error) {
    next(error);
  }
}

export async function createInsight(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { deviceId, type, title, description, severity, actionable, actions } = req.body;

    // Check if device belongs to user
    const [devices]: any = await pool.query(
      'SELECT id FROM devices WHERE id = ? AND user_id = ?',
      [deviceId, userId]
    );

    if (devices.length === 0) {
      throw new AppError('Device not found', 404);
    }

    const insightId = generateId();
    const actionsJson = actions ? JSON.stringify(actions) : null;

    await pool.query(
      `INSERT INTO insights 
       (id, device_id, type, title, description, severity, actionable, actions) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [insightId, deviceId, type, title, description, severity, actionable, actionsJson]
    );

    const [newInsights]: any = await pool.query(
      'SELECT * FROM insights WHERE id = ?',
      [insightId]
    );

    const insight = newInsights[0];
    insight.actions = parseActions(insight.actions);

    res.status(201).json({
      success: true,
      data: insight
    });
  } catch (error) {
    next(error);
  }
}

export async function getAITips(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const deviceId = req.params.id;

    // Check if device belongs to user
    const [devices]: any = await pool.query(
      'SELECT id FROM devices WHERE id = ? AND user_id = ?',
      [deviceId, userId]
    );

    if (devices.length === 0) {
      throw new AppError('Device not found', 404);
    }

    // forceRefresh=true skips cooldown so each button press generates a new tip
    const insight = await generateAIInsight(deviceId, true);

    // Send push notification with the AI tip (fire-and-forget)
    if (insight) {
      sendUserNotification(
        userId,
        `AI Tip: ${insight.title}`,
        insight.description || 'New AI workspace tip generated. Open the app to view it.',
        { type: 'ai_tip', deviceId }
      ).catch((err) => console.error('AI tip notification failed:', err));
    }

    res.json({
      success: true,
      data: insight
    });
  } catch (error: any) {
    console.error(`❌ AI Tips failed for device ${req.params.id}:`, error.message || error);
    next(error);
  }
}

export async function getReports(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const timeRange = req.query.timeRange as string || '24h';
    const metricParam = req.query.metric as string || 'air_quality';

    // Validate metric to prevent SQL injection
    const metric = ALLOWED_METRICS.has(metricParam) ? metricParam : 'air_quality';

    // Calculate time range in hours
    let hours = 24;
    switch (timeRange) {
      case '1h':  hours = 1;   break;
      case '6h':  hours = 6;   break;
      case '24h': hours = 24;  break;
      case '7d':  hours = 168; break;
      case '30d': hours = 720; break;
    }

    // Choose aggregation based on time range
    // 1h → 10-min buckets (~6 points), 24h → 2 hours (~12 points),
    // 7d → 12 hours (~14 points), 30d → 2 days (~15 points)
    let bucketSeconds: number;
    if (timeRange === '1h') {
      bucketSeconds = 600;      // 10 minutes
    } else if (timeRange === '24h') {
      bucketSeconds = 7200;     // 2 hours
    } else if (timeRange === '7d') {
      bucketSeconds = 43200;    // 12 hours
    } else {
      bucketSeconds = 172800;   // 2 days
    }

    const bucketExpr = `to_timestamp(floor(extract(epoch from sr.timestamp) / ${bucketSeconds}) * ${bucketSeconds})`;

    const [readings]: any = await pool.query(
      `SELECT
        ${bucketExpr} as hour,
        AVG(sr.${metric}) as avg_value,
        MIN(sr.${metric}) as min_value,
        MAX(sr.${metric}) as max_value,
        COUNT(*)::int as count
       FROM sensor_readings sr
       INNER JOIN devices d ON sr.device_id = d.id
       WHERE d.user_id = ?
       AND sr.timestamp >= NOW() - (? * INTERVAL '1 hour')
       AND sr.${metric} IS NOT NULL
       GROUP BY ${bucketExpr}
       ORDER BY hour ASC`,
      [userId, hours]
    );

    // Format labels — show only every Nth label to prevent overlap, blank out the rest
    const maxLabels = 6;
    const step = readings.length > maxLabels ? Math.ceil(readings.length / maxLabels) : 1;

    const labels: string[] = readings.map((r: any, i: number) => {
      if (i % step !== 0) return '';  // blank label to avoid overlap
      const date = new Date(r.hour);
      if (timeRange === '1h') {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      } else if (timeRange === '24h') {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      } else if (timeRange === '7d') {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    });

    const data: number[] = readings.map((r: any) => parseFloat(r.avg_value) || 0);

    // Compute avg/min/max in a single pass to avoid iterating the array three times
    let sum = 0, min = Infinity, max = -Infinity;
    for (const v of data) {
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const avg    = data.length > 0 ? sum / data.length : 0;
    const minVal = data.length > 0 ? min : 0;
    const maxVal = data.length > 0 ? max : 0;

    // Determine chart color based on metric (as a static RGBA string — NOT a function)
    const colorMap: Record<string, string> = {
      air_quality:  'rgba(46, 125, 50, 1)',
      light_level:  'rgba(245, 124, 0, 1)',
      noise_level:  'rgba(21, 101, 192, 1)',
      temperature:  'rgba(211, 47, 47, 1)',
      humidity:     'rgba(123, 31, 162, 1)',
    };
    const color = colorMap[metric] || 'rgba(158, 158, 158, 1)';

    // For 1h and 24h, also return the last 20 individual readings with timestamps
    let recentReadings: any[] = [];
    if (timeRange === '1h' || timeRange === '24h') {
      const [rawReadings]: any = await pool.query(
        `SELECT
          sr.${metric} as value,
          sr.timestamp
         FROM sensor_readings sr
         INNER JOIN devices d ON sr.device_id = d.id
         WHERE d.user_id = ?
         AND sr.timestamp >= NOW() - (? * INTERVAL '1 hour')
         AND sr.${metric} IS NOT NULL
         ORDER BY sr.timestamp DESC
         LIMIT 20`,
        [userId, hours]
      );

      recentReadings = rawReadings.map((r: any) => ({
        value: parseFloat(parseFloat(r.value).toFixed(1)),
        timestamp: r.timestamp,
      }));
    }

    res.json({
      success: true,
      data: {
        labels,
        datasets: [{
          data,
          color,
          strokeWidth: 2,
        }],
        stats: {
          average: parseFloat(avg.toFixed(2)),
          min:     parseFloat(minVal.toFixed(2)),
          max:     parseFloat(maxVal.toFixed(2)),
          count:   readings.length,
        },
        recentReadings,
      }
    });
  } catch (error) {
    next(error);
  }
}

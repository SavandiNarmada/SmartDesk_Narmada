import pool from '../config/database';
import { generateId } from '../utils/helpers';

const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_INTERVAL_HOURS = parseInt(process.env.AI_INSIGHT_INTERVAL_HOURS || '2', 10);

async function callGemini(prompt: string): Promise<any> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${AI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${text}`);
  }
  const data: any = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return JSON.parse(text);
}

async function callOpenAI(prompt: string): Promise<any> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${text}`);
  }
  const data: any = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty OpenAI response');
  return JSON.parse(content);
}

export async function generateAIInsight(deviceId: string, forceRefresh = false): Promise<any> {
  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY not configured');
  }

  // Check cooldown (skip if user manually requested via button)
  if (!forceRefresh) {
    const cooldownMs = AI_INTERVAL_HOURS * 60 * 60 * 1000;
    const [recent]: any = await pool.query(
      `SELECT id FROM insights WHERE device_id = ? AND source = 'ai' AND timestamp >= ? LIMIT 1`,
      [deviceId, new Date(Date.now() - cooldownMs)]
    );
    if (recent.length > 0) {
      const [latest]: any = await pool.query(
        `SELECT * FROM insights WHERE device_id = ? AND source = 'ai' ORDER BY timestamp DESC LIMIT 1`,
        [deviceId]
      );
      return latest[0] || null;
    }
  }

  // Get device info
  const [devices]: any = await pool.query(
    `SELECT name, location FROM devices WHERE id = ?`,
    [deviceId]
  );
  if (devices.length === 0) throw new Error('Device not found');
  const device = devices[0];

  // Get recent readings
  const [readings]: any = await pool.query(
    `SELECT * FROM sensor_readings WHERE device_id = ? ORDER BY timestamp DESC LIMIT 10`,
    [deviceId]
  );
  if (readings.length === 0) throw new Error('No sensor data available');

  const latest = readings[0];
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  // Build trend info
  let trendInfo = '';
  if (readings.length >= 3) {
    const first = readings[readings.length - 1];
    if (latest.air_quality && first.air_quality) {
      const diff = latest.air_quality - first.air_quality;
      trendInfo += `Air quality trend: ${diff > 0 ? 'rising' : 'falling'} (${Math.abs(diff).toFixed(0)} AQI change). `;
    }
    if (latest.noise_level && first.noise_level) {
      const diff = latest.noise_level - first.noise_level;
      trendInfo += `Noise trend: ${diff > 0 ? 'rising' : 'falling'} (${Math.abs(diff).toFixed(0)} dB change). `;
    }
  }

  const prompt = `You are a smart workspace health advisor. Based on the following sensor data from a desk environment called "${device.name}" in "${device.location}", provide 1-2 actionable tips.

Current readings:
- Air Quality: ${latest.air_quality != null ? latest.air_quality + ' AQI' : 'N/A'}
- Light Level: ${latest.light_level != null ? latest.light_level + ' lux' : 'N/A'}
- Noise Level: ${latest.noise_level != null ? latest.noise_level + ' dB' : 'N/A'}
- Temperature: ${latest.temperature != null ? latest.temperature + ' °C' : 'N/A'}
- Humidity: ${latest.humidity != null ? latest.humidity + ' %' : 'N/A'}
- Time: ${timeOfDay} (${new Date().toLocaleTimeString()})
${trendInfo ? `\nTrends: ${trendInfo}` : ''}

Respond with JSON: {"title": "short title", "description": "2-3 sentence advice", "severity": "info|warning|critical", "actions": ["action1", "action2", "action3"]}`;

  let aiResult: any;
  if (AI_PROVIDER === 'openai') {
    aiResult = await callOpenAI(prompt);
  } else {
    aiResult = await callGemini(prompt);
  }

  // Store the AI insight
  const insightId = generateId();
  await pool.query(
    `INSERT INTO insights (id, device_id, type, title, description, severity, actionable, actions, source)
     VALUES (?, ?, 'ai_recommendation', ?, ?, ?, ?, ?, 'ai')`,
    [
      insightId,
      deviceId,
      aiResult.title || 'AI Workspace Tip',
      aiResult.description || 'Check your workspace conditions.',
      aiResult.severity || 'info',
      true,
      JSON.stringify(aiResult.actions || []),
    ]
  );

  const [inserted]: any = await pool.query(`SELECT * FROM insights WHERE id = ?`, [insightId]);
  return inserted[0];
}

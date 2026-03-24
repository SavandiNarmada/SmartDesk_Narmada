import { SensorThresholds, DEFAULT_THRESHOLDS, RoomCondition } from '../types';

interface SensorValues {
  airQuality?: number | null;
  lightLevel?: number | null;
  noiseLevel?: number | null;
  temperature?: number | null;
  humidity?: number | null;
}

function getLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: '#4CAF50' };
  if (score >= 60) return { label: 'Good', color: '#8BC34A' };
  if (score >= 40) return { label: 'Moderate', color: '#FF9800' };
  if (score >= 20) return { label: 'Poor', color: '#FF5722' };
  return { label: 'Bad', color: '#F44336' };
}

function scoreAirQuality(value: number, t: typeof DEFAULT_THRESHOLDS): number {
  if (value <= t.aqi_excellent_max) return 100;
  if (value <= t.aqi_good_max) return 75;
  if (value <= t.aqi_moderate_max) return 50;
  return 25;
}

function scoreLightLevel(value: number, t: typeof DEFAULT_THRESHOLDS): number {
  if (value >= t.light_good_min && value <= t.light_good_max) return 100;
  if (value >= t.light_low_min && value < t.light_good_min) return 60;
  if (value > t.light_good_max && value <= t.light_bright_max) return 60;
  return 25;
}

function scoreNoiseLevel(value: number, t: typeof DEFAULT_THRESHOLDS): number {
  if (value <= t.noise_quiet_max) return 100;
  if (value <= t.noise_moderate_max) return 75;
  if (value <= t.noise_loud_max) return 50;
  return 25;
}

function scoreTemperature(value: number, t: typeof DEFAULT_THRESHOLDS): number {
  if (value >= t.temp_good_min && value <= t.temp_good_max) return 100;
  if (value > t.temp_cold_max && value < t.temp_good_min) return 60;
  if (value > t.temp_good_max && value < t.temp_hot_min) return 60;
  return 25;
}

function scoreHumidity(value: number, t: typeof DEFAULT_THRESHOLDS): number {
  if (value >= t.humidity_good_min && value <= t.humidity_good_max) return 100;
  if (value > t.humidity_dry_max && value < t.humidity_good_min) return 60;
  if (value > t.humidity_good_max && value < t.humidity_wet_min) return 60;
  return 25;
}

export function calculateRoomCondition(
  values: SensorValues,
  thresholds?: Partial<SensorThresholds> | null
): RoomCondition {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };

  // Apply calibration offsets
  const aq = values.airQuality != null ? values.airQuality + t.offset_air_quality : null;
  const ll = values.lightLevel != null ? values.lightLevel + t.offset_light_level : null;
  const nl = values.noiseLevel != null ? values.noiseLevel + t.offset_noise_level : null;
  const temp = values.temperature != null ? values.temperature + t.offset_temperature : null;
  const hum = values.humidity != null ? values.humidity + t.offset_humidity : null;

  // Weights: AQI 30%, Noise 25%, Light 20%, Temp 15%, Humidity 10%
  const weights = { aq: 0.3, nl: 0.25, ll: 0.2, temp: 0.15, hum: 0.1 };
  let totalWeight = 0;
  let weightedSum = 0;

  const aqScore = aq != null ? scoreAirQuality(aq, t) : 75;
  const llScore = ll != null ? scoreLightLevel(ll, t) : 75;
  const nlScore = nl != null ? scoreNoiseLevel(nl, t) : 75;
  const tempScore = temp != null ? scoreTemperature(temp, t) : 75;
  const humScore = hum != null ? scoreHumidity(hum, t) : 75;

  if (aq != null) { weightedSum += aqScore * weights.aq; totalWeight += weights.aq; }
  if (ll != null) { weightedSum += llScore * weights.ll; totalWeight += weights.ll; }
  if (nl != null) { weightedSum += nlScore * weights.nl; totalWeight += weights.nl; }
  if (temp != null) { weightedSum += tempScore * weights.temp; totalWeight += weights.temp; }
  if (hum != null) { weightedSum += humScore * weights.hum; totalWeight += weights.hum; }

  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 75;
  const overall = getLabel(overallScore);

  return {
    score: overallScore,
    label: overall.label,
    color: overall.color,
    breakdown: {
      airQuality: { score: aqScore, ...getLabel(aqScore) },
      lightLevel: { score: llScore, ...getLabel(llScore) },
      noiseLevel: { score: nlScore, ...getLabel(nlScore) },
      temperature: { score: tempScore, ...getLabel(tempScore) },
      humidity: { score: humScore, ...getLabel(humScore) },
    },
  };
}

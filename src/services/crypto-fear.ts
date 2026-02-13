import { API_URLS } from '@/config';
import { fetchWithProxy } from '@/utils';

export interface FearMeterComponent {
  alternativeFng: number | null;
  volatility: number;
  whaleActivity: number;
  regulatory: number;
  liquidations: number;
  macro: number;
}

export interface FearStatus {
  level:
    | 'EXTREME FEAR'
    | 'HIGH FEAR'
    | 'MODERATE FEAR'
    | 'SLIGHT FEAR'
    | 'GREED'
    | 'EXTREME GREED';
  emoji: string;
  color: string;
}

export interface FearSignals {
  trend: 'bearish' | 'bullish' | 'neutral';
  recommendations: string[];
}

export interface HistoricalContext {
  allTimeHigh: number;
  allTimeLow: number;
  currentPercentile: number;
}

export interface CryptoFearMeter {
  timestamp: string;
  fearScore: number;
  fearStatus: FearStatus;
  components: FearMeterComponent;
  signals: FearSignals;
  historicalContext: HistoricalContext;
}

/**
 * Fetch real-time crypto fear meter
 */
export async function fetchCryptoFearMeter(): Promise<CryptoFearMeter | null> {
  try {
    const response = await fetchWithProxy(API_URLS.cryptoFearMeter);

    if (!response.ok) {
      console.warn(`[Fear] API returned ${response.status}`);
      return null;
    }

    const data: CryptoFearMeter = await response.json();
    return data;
  } catch (error) {
    console.error('[Fear] Fetch failed:', error);
    return null;
  }
}

/**
 * Determine investment action based on fear meter
 */
export function getInvestmentAction(
  fearScore: number
): { action: 'BUY' | 'HOLD' | 'SELL'; confidence: number } {
  if (fearScore >= 80) {
    return { action: 'BUY', confidence: 0.9 };
  }
  if (fearScore >= 65) {
    return { action: 'BUY', confidence: 0.7 };
  }
  if (fearScore >= 50) {
    return { action: 'HOLD', confidence: 0.5 };
  }
  if (fearScore >= 35) {
    return { action: 'HOLD', confidence: 0.6 };
  }
  if (fearScore >= 20) {
    return { action: 'SELL', confidence: 0.6 };
  }
  return { action: 'SELL', confidence: 0.8 };
}

/**
 * Get historical fear statistics
 */
export function getHistoricalStats(measurements: CryptoFearMeter[]): {
  average: number;
  median: number;
  stdDev: number;
  max: number;
  min: number;
} {
  const scores = measurements.map(m => m.fearScore);
  const sorted = [...scores].sort((a, b) => a - b);
  const n = scores.length;

  const average = scores.reduce((a, b) => a + b, 0) / n;
  let median = 0;
  if (n % 2 === 0) {
    const mid1 = sorted[n / 2 - 1];
    const mid2 = sorted[n / 2];
    median = mid1 !== undefined && mid2 !== undefined ? (mid1 + mid2) / 2 : 0;
  } else {
    const mid = sorted[Math.floor(n / 2)];
    median = mid !== undefined ? mid : 0;
  }

  const variance = scores.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  return {
    average: Math.round(average),
    median,
    stdDev: Math.round(stdDev),
    max: Math.max(...scores),
    min: Math.min(...scores),
  };
}

/**
 * Check if current fear level is anomalous
 */
export function isAnomalousFearLevel(current: number, historical: CryptoFearMeter[]): boolean {
  const measurements = historical.map(m => m.fearScore);
  const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
  const stdDev = Math.sqrt(
    measurements.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / measurements.length
  );

  return Math.abs(current - avg) > 2 * stdDev;
}

/**
 * Generate fear alert based on rapid changes
 */
export function generateFearAlert(
  current: CryptoFearMeter,
  previous: CryptoFearMeter
): { alert: boolean; severity: 'critical' | 'high' | 'moderate'; message: string } | null {
  const change = current.fearScore - previous.fearScore;

  if (change > 20) {
    return {
      alert: true,
      severity: 'critical',
      message: `Fear spiked by ${change.toFixed(0)} points`,
    };
  }

  if (change > 10) {
    return {
      alert: true,
      severity: 'high',
      message: `Fear increased by ${change.toFixed(0)} points`,
    };
  }

  if (change < -20) {
    return {
      alert: true,
      severity: 'moderate',
      message: `Fear dropped sharply - potential momentum shift`,
    };
  }

  return null;
}

export const config = { runtime: 'edge' };

import { getCachedJson, setCachedJson, hashString } from './_upstash-cache.js';
import { recordCacheTelemetry } from './_cache-telemetry.js';

const CACHE_TTL_SECONDS = 180; // 3 minutes for real-time updates
const RESPONSE_CACHE_CONTROL = 'public, max-age=180, stale-while-revalidate=60';

// Alternative Crypto Fear and Greed Index sources
const FEAR_GREED_API = 'https://api.alternative.me/fng/';

function getHeaders(xCache, cacheControl = RESPONSE_CACHE_CONTROL) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': cacheControl,
    'X-Cache': xCache,
  };
}

async function fetchAlternativeIndex() {
  try {
    const response = await fetch(`${FEAR_GREED_API}?limit=1`);
    if (!response.ok) throw new Error(`Fear/Greed API: ${response.status}`);
    const data = await response.json();
    return data.data?.[0] || null;
  } catch (error) {
    console.error('Fear/Greed index fetch failed:', error);
    return null;
  }
}

function calculateVolatilityFear(priceData = {}) {
  // Higher volatility = higher fear
  // Simulate BTC/ETH volatility - in production integrate real volatility feeds
  const mockVolatility = Math.random() * 100;
  return Math.round(mockVolatility);
}

function calculateWhaleActivityFear(whaleData = {}) {
  // Large sales = higher fear, large buys = lower fear
  // Mock data - integrate with blockchain data
  const mockWhaleFear = Math.random() * 100;
  return Math.round(mockWhaleFear);
}

function calculateRegulatoryRisk() {
  // Track recent regulatory news and announcements
  // Mock data - integrate with regulatory feeds
  const riskFactors = {
    usFca: 25, // UK FCA actions
    sec: 35, // US SEC scrutiny
    china: 45, // Hong Kong/China related
    eu: 20, // Europe regulation
  };

  return Math.round(
    Object.values(riskFactors).reduce((a, b) => a + b) / Object.keys(riskFactors).length
  );
}

function calculateLiquidationRisk(marketData = {}) {
  // Based on liquidation cascades, leverage ratios
  // Mock - integrate with Coinglass, Bybit liquidation data
  return Math.round(Math.random() * 60);
}

function calculateMacroFear() {
  // Stock market VIX, bond yields, inflation data
  // Mock - integrate with FRED API
  return Math.round(Math.random() * 70);
}

function aggregateFearScore(components) {
  const weights = {
    alternativeFng: 0.25, // Alternative's index
    volatility: 0.15,
    whaleActivity: 0.15,
    regulatory: 0.2,
    liquidations: 0.15,
    macro: 0.1,
  };

  let total = 0;
  let validComponents = 0;

  for (const [key, value] of Object.entries(components)) {
    if (value !== null && value !== undefined) {
      total += (value * weights[key]) || 0;
      validComponents++;
    }
  }

  return Math.round(total);
}

function getFearLevel(score) {
  if (score >= 75) return { level: 'EXTREME FEAR', emoji: '😱', color: '#d32f2f' };
  if (score >= 60) return { level: 'HIGH FEAR', emoji: '😟', color: '#f57c00' };
  if (score >= 45) return { level: 'MODERATE FEAR', emoji: '😐', color: '#ffa726' };
  if (score >= 30) return { level: 'SLIGHT FEAR', emoji: '🤔', color: '#ffb74d' };
  if (score >= 15) return { level: 'GREED', emoji: '🤑', color: '#4caf50' };
  return { level: 'EXTREME GREED', emoji: '🚀', color: '#2e7d32' };
}

export default async function handler(request) {
  const cacheKey = hashString('crypto-fear-meter');
  const cached = await getCachedJson(cacheKey, CACHE_TTL_SECONDS);

  if (cached) {
    recordCacheTelemetry(cacheKey, true);
    return new Response(JSON.stringify(cached), {
      headers: getHeaders('HIT'),
    });
  }

  try {
    // Fetch components
    const fngData = await fetchAlternativeIndex();
    const alternativeFng = fngData ? parseInt(fngData.value) : null;

    const components = {
      alternativeFng,
      volatility: calculateVolatilityFear(),
      whaleActivity: calculateWhaleActivityFear(),
      regulatory: calculateRegulatoryRisk(),
      liquidations: calculateLiquidationRisk(),
      macro: calculateMacroFear(),
    };

    const fearScore = aggregateFearScore(components);
    const fearStatus = getFearLevel(fearScore);

    const result = {
      timestamp: new Date().toISOString(),
      fearScore,
      fearStatus,
      components,
      signals: {
        trend: fearScore > 60 ? 'bearish' : fearScore < 40 ? 'bullish' : 'neutral',
        recommendations: generateRecommendations(fearScore),
      },
      historicalContext: {
        allTimeHigh: 93,
        allTimeLow: 10,
        currentPercentile: Math.round((fearScore / 100) * 100),
      },
    };

    await setCachedJson(cacheKey, result, CACHE_TTL_SECONDS);
    recordCacheTelemetry(cacheKey, false);

    return new Response(JSON.stringify(result), {
      headers: getHeaders('MISS'),
    });
  } catch (error) {
    console.error('Fear meter calculation failed:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: getHeaders('MISS'),
      }
    );
  }
}

function generateRecommendations(fearScore) {
  const recommendations = [];

  if (fearScore >= 75) {
    recommendations.push(
      'Extreme fear detected - historically strong buying opportunities for long-term holders',
      'Monitor liquidation cascades',
      'Watch for major institutional accumulation'
    );
  } else if (fearScore >= 60) {
    recommendations.push(
      'High fear environment - consider DCA strategy',
      'Review staking yields for income',
      'Reduce leverage exposure'
    );
  } else if (fearScore >= 45) {
    recommendations.push(
      'Moderate fear - balanced risk-reward',
      'Monitor whale movements',
      'Track regulatory developments'
    );
  } else if (fearScore >= 30) {
    recommendations.push(
      'Slight fear - potential consolidation phase',
      'Consider profit-taking on winners',
      'Monitor macro headwinds'
    );
  } else {
    recommendations.push(
      'Greed phase - historically precedes corrections',
      'Increase risk management strictness',
      'Review portfolio concentration'
    );
  }

  return recommendations;
}

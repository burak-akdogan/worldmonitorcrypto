export const config = { runtime: 'edge' };

import { getCachedJson, setCachedJson, hashString } from './_upstash-cache.js';
import { recordCacheTelemetry } from './_cache-telemetry.js';

const CACHE_TTL_SECONDS = 300; // 5 minutes
const RESPONSE_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=120';

// FUD Keywords and patterns - high confidence FUD signals
const FUD_KEYWORDS = {
  critical: [
    'hack',
    'exploit',
    'breach',
    'fraud',
    'collapse',
    'bankrupt',
    'scam',
    'crash',
    'useless',
    'dead',
    'ponzi',
    'rug pull',
    'exit scam',
    'hacked',
    'stolen',
  ],
  high: [
    'ban',
    'illegal',
    'lawsuit',
    'investigation',
    'indictment',
    'prison',
    'arrest',
    'subpoena',
    'delisted',
    'shutdown',
    'fallout',
    'betrayal',
    'convicted',
  ],
  medium: [
    'concern',
    'warning',
    'risk',
    'doubt',
    'skeptic',
    'failed',
    'worst',
    'worst performing',
    'down',
    'slump',
    'plummet',
  ],
};

// FOMO Keywords - opposite of FUD
const FOMO_KEYWORDS = [
  'moon',
  'surge',
  'rally',
  'boom',
  'explosion',
  'breakout',
  'pump',
  'bull',
  'bullish',
  'lambo',
  'skyrocket',
  'soaring',
];

// Fear/Uncertainty indicators
const UNCERTAINTY_PATTERNS = [
  /could (result in|lead to|mean) market collapse/i,
  /potential (end|death|death) of/i,
  /imminent (doom|crisis|failure)/i,
  /warning (sign|signal) of/i,
  /red flags/i,
  /major red flag/i,
];

function calculateFudScore(text) {
  if (!text) return 0;

  const lowerText = text.toLowerCase();
  let score = 0;

  // Count critical keywords
  for (const keyword of FUD_KEYWORDS.critical) {
    const matches = (lowerText.match(new RegExp(keyword, 'gi')) || []).length;
    score += matches * 10;
  }

  // Count high-severity keywords
  for (const keyword of FUD_KEYWORDS.high) {
    const matches = (lowerText.match(new RegExp(keyword, 'gi')) || []).length;
    score += matches * 6;
  }

  // Count medium-severity keywords
  for (const keyword of FUD_KEYWORDS.medium) {
    const matches = (lowerText.match(new RegExp(keyword, 'gi')) || []).length;
    score += matches * 2;
  }

  // Check for uncertainty patterns
  for (const pattern of UNCERTAINTY_PATTERNS) {
    if (pattern.test(text)) score += 5;
  }

  // Reduce score for FOMO keywords (not FUD)
  for (const keyword of FOMO_KEYWORDS) {
    const matches = (lowerText.match(new RegExp(keyword, 'gi')) || []).length;
    score -= matches * 2;
  }

  return Math.max(0, Math.min(100, score)); // Clamp to 0-100
}

function getFudLevel(score) {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  if (score >= 20) return 'LOW';
  return 'MINIMAL';
}

function getHeaders(xCache, cacheControl = RESPONSE_CACHE_CONTROL) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': cacheControl,
    'X-Cache': xCache,
  };
}

// Score an article for FUD intensity
export async function scoreArticleForFud(article) {
  const titleScore = calculateFudScore(article.title) * 0.6;
  const descriptionScore = calculateFudScore(article.description || '') * 0.4;
  const contentScore = calculateFudScore(article.content || '') * 0.5;

  const totalScore = Math.round((titleScore + descriptionScore + contentScore) / 1.5);

  return {
    article: {
      title: article.title,
      source: article.source,
      url: article.url,
      timestamp: article.timestamp,
    },
    fudScore: totalScore,
    fudLevel: getFudLevel(totalScore),
    isFud: totalScore > 40,
    keywords: extractFudKeywords(article.title + ' ' + (article.description || '')),
  };
}

function extractFudKeywords(text) {
  const found = [];
  const lowerText = text.toLowerCase();

  for (const severity in FUD_KEYWORDS) {
    for (const keyword of FUD_KEYWORDS[severity]) {
      if (lowerText.includes(keyword)) {
        found.push({ keyword, severity });
      }
    }
  }

  return found.slice(0, 5); // Top 5
}

export default async function handler(request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'score';

  if (action === 'score' && request.method === 'POST') {
    try {
      const articles = await request.json();

      if (!Array.isArray(articles)) {
        return new Response(
          JSON.stringify({ error: 'Expected array of articles' }),
          { status: 400, headers: getHeaders('MISS') }
        );
      }

      const scored = await Promise.all(
        articles.map(article => scoreArticleForFud(article))
      );

      // Calculate aggregate FUD metrics
      const avgFudScore = Math.round(
        scored.reduce((sum, s) => sum + s.fudScore, 0) / scored.length
      );
      const fudCount = scored.filter(s => s.isFud).length;
      const fudPercentage = Math.round((fudCount / scored.length) * 100);

      return new Response(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          articlesScored: scored.length,
          aggregateMetrics: {
            averageFudScore: avgFudScore,
            fudArticlesCount: fudCount,
            fudPercentage,
            fudLevel: getFudLevel(avgFudScore),
          },
          articles: scored.sort((a, b) => b.fudScore - a.fudScore),
        }),
        { headers: getHeaders('MISS') }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: getHeaders('MISS') }
      );
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'FUD Detector API. POST article array to /crypto-fud-detector?action=score',
      example: {
        action: 'score',
        articles: [
          {
            title: 'Bitcoin Could Face a Historic Collapse',
            description: 'Expert warns of major hack risk',
            content: 'Analysis shows potential exploit',
            source: 'example.com',
            url: 'https://example.com',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    }),
    { headers: getHeaders('HIT') }
  );
}

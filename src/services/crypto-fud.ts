import type { NewsItem } from '@/types';
import { API_URLS } from '@/config';

export interface FudScore {
  title: string;
  source: string;
  url: string;
  fudScore: number;
  fudLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'MINIMAL';
  isFud: boolean;
  keywords: Array<{ keyword: string; severity: string }>;
}

export interface FudAnalysisResult {
  timestamp: string;
  articlesScored: number;
  aggregateMetrics: {
    averageFudScore: number;
    fudArticlesCount: number;
    fudPercentage: number;
    fudLevel: string;
  };
  articles: FudScore[];
}

/**
 * Analyze crypto news articles for FUD (Fear, Uncertainty, Doubt) content
 */
export async function analyzeCryptoFud(articles: NewsItem[]): Promise<FudAnalysisResult | null> {
  if (!articles || articles.length === 0) return null;

  try {
    const payload = articles.map(article => ({
      title: article.title || '',
      description: article.title || '',
      content: article.title || '',
      source: article.source || 'unknown',
      url: article.link || '',
      timestamp: article.pubDate?.toISOString() || new Date().toISOString(),
    }));

    const response = await fetch(API_URLS.cryptoFudDetector, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`[FUD] API returned ${response.status}`);
      return null;
    }

    const data: FudAnalysisResult = await response.json();
    return data;
  } catch (error) {
    console.error('[FUD] Analysis failed:', error);
    return null;
  }
}

/**
 * Filter articles by fear level
 */
export function filterByFearLevel(
  articles: FudScore[],
  minLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'MINIMAL'
): FudScore[] {
  const levels = ['MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
  const minIndex = levels.indexOf(minLevel);

  return articles.filter(a => {
    const aIndex = levels.indexOf(a.fudLevel);
    return aIndex >= minIndex;
  });
}

/**
 * Get trending FUD topics
 */
export function getTrendingFudTopics(articles: FudScore[]): Map<string, number> {
  const topics = new Map<string, number>();

  for (const article of articles) {
    for (const { keyword } of article.keywords) {
      topics.set(keyword, (topics.get(keyword) || 0) + 1);
    }
  }

  return new Map([...topics.entries()].sort((a, b) => b[1] - a[1]));
}

/**
 * Calculate FUD momentum (trending up or down)
 */
export function calculateFudMomentum(
  current: FudAnalysisResult,
  previous: FudAnalysisResult
): number {
  return current.aggregateMetrics.averageFudScore - previous.aggregateMetrics.averageFudScore;
}

/**
 * Identify FUD campaigns (coordinated attack)
 */
export function identifyFudCampaigns(articles: FudScore[]): Map<string, FudScore[]> {
  const campaigns = new Map<string, FudScore[]>();

  for (const article of articles) {
    if (article.isFud && article.keywords.length > 0) {
      const mainKeyword = article.keywords[0]?.keyword;
      if (mainKeyword) {
        if (!campaigns.has(mainKeyword)) {
          campaigns.set(mainKeyword, []);
        }
        campaigns.get(mainKeyword)!.push(article);
      }
    }
  }

  // Filter to only significant campaigns (3+ articles)
  for (const [key, articles] of campaigns.entries()) {
    if (articles.length < 3) {
      campaigns.delete(key);
    }
  }

  return campaigns;
}

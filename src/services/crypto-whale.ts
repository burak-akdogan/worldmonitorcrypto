import { API_URLS } from '@/config';
import { fetchWithProxy } from '@/utils';

export interface WhaleTransaction {
  blockchain: string;
  from: { address: string; owner?: string };
  to: { address: string; owner?: string };
  hash: string;
  amount: number;
  amount_usd: number;
  timestamp: number;
  transaction_type: 'transfer' | 'burn' | 'mint';
}

export interface CryptoHolder {
  address: string;
  alias?: string;
  balance: number;
  usdValue: number;
  type: 'exchange' | 'trust' | 'defi' | 'government' | 'legacy' | 'unknown';
  percentage?: number; // Percentage of circulating supply
}

export interface VCPosition {
  vc: string;
  portfolio: string[];
  recentActivity: {
    lastUpdate: string;
    totalAUM: number;
    majorHoldings: string[];
  };
}

export interface WhaleAlertResponse {
  success: boolean;
  timestamp: string;
  whaleTransactions: WhaleTransaction[];
  error?: string;
}

export interface HoldersResponse {
  success: boolean;
  timestamp: string;
  holders: Record<string, CryptoHolder[]>;
  error?: string;
}

export interface VCMovementsResponse {
  success: boolean;
  timestamp: string;
  vcMovements: VCPosition[];
  error?: string;
}

/**
 * Fetch whale alert transactions
 */
export async function fetchWhaleAlerts(options = {}): Promise<WhaleTransaction[]> {
  try {
    const params = new URLSearchParams({
      source: 'whales',
      ...options,
    });

    const response = await fetchWithProxy(`${API_URLS.cryptoWhaleAlerts}?${params}`);

    if (!response.ok) {
      console.warn(`[Whale] API returned ${response.status}`);
      return [];
    }

    const data: WhaleAlertResponse = await response.json();
    return data.whaleTransactions || [];
  } catch (error) {
    console.error('[Whale] Fetch failed:', error);
    return [];
  }
}

/**
 * Fetch major crypto holders across exchanges, trusts, and on-chain
 */
export async function fetchMajorCryptoHolders(): Promise<Record<string, CryptoHolder[]>> {
  try {
    const response = await fetchWithProxy(`${API_URLS.cryptoWhaleAlerts}?source=holders`);

    if (!response.ok) {
      console.warn(`[Holders] API returned ${response.status}`);
      return {};
    }

    const data: HoldersResponse = await response.json();
    return data.holders || {};
  } catch (error) {
    console.error('[Holders] Fetch failed:', error);
    return {};
  }
}

/**
 * Fetch VC crypto fund positions and movements
 */
export async function fetchVCMovements(): Promise<VCPosition[]> {
  try {
    const response = await fetchWithProxy(`${API_URLS.cryptoWhaleAlerts}?source=vcs`);

    if (!response.ok) {
      console.warn(`[VC] API returned ${response.status}`);
      return [];
    }

    const data: VCMovementsResponse = await response.json();
    return data.vcMovements || [];
  } catch (error) {
    console.error('[VC] Fetch failed:', error);
    return [];
  }
}

/**
 * Analyze whale transaction patterns
 */
export function analyzeWhalePatterns(transactions: WhaleTransaction[]) {
  const buyPressure = transactions.filter(t => t.to.owner && t.to.owner.includes('Exchange')).length;
  const sellPressure = transactions.filter(t => t.from.owner && t.from.owner.includes('Exchange')).length;
  const totalVolume = transactions.reduce((sum, t) => sum + t.amount_usd, 0);

  return {
    buyPressure,
    sellPressure,
    netPressure: buyPressure - sellPressure,
    totalVolumeUsd: totalVolume,
    averageTransaction: totalVolume / transactions.length,
    sentiment: buyPressure > sellPressure ? 'bullish' : sellPressure > buyPressure ? 'bearish' : 'neutral',
  };
}

/**
 * Get concentration risk (how much % of supply is held by top addresses)
 */
export function calculateConcentrationRisk(holders: CryptoHolder[]): number {
  const totalValue = holders.reduce((sum, h) => sum + h.usdValue, 0);
  const top10Value = holders.slice(0, 10).reduce((sum, h) => sum + h.usdValue, 0);

  return (top10Value / totalValue) * 100; // Percentage
}

/**
 * Detect unusual whale activity
 */
export function detectUnusualActivity(transactions: WhaleTransaction[], threshold = 5000000) {
  return transactions.filter(t => t.amount_usd >= threshold);
}

/**
 * Monitor VC fund portfolio concentration
 */
export function analyzeVCConcentration(vcPositions: VCPosition[]) {
  return vcPositions.map(vc => ({
    vc: vc.vc,
    portfolio: vc.portfolio,
    concentration: (vc.recentActivity.majorHoldings.length / vc.portfolio.length) * 100,
    aum: vc.recentActivity.totalAUM,
  }));
}

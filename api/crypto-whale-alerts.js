export const config = { runtime: 'edge' };

import { getCachedJson, setCachedJson, hashString } from './_upstash-cache.js';
import { recordCacheTelemetry } from './_cache-telemetry.js';

const WHALE_API_URL = 'https://api.whale-alert.io/v1/transactions';
const BLOCKCHAIR_API_URL = 'https://blockchair.com/api/v1';
const CACHE_TTL_SECONDS = 300; // 5 minutes
const RESPONSE_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=120';

// Known crypto whales and VCs
const KNOWN_WHALES = [
  { address: '0x1234567890abcdef', alias: 'Grayscale Bitcoin Trust' },
  { address: '0xabcdef1234567890', alias: 'Hypothesis Labs' },
];

const KNOWN_VCS = [
  { name: 'a16z crypto', keywords: ['Andreessen', 'a16z', 'crypto'] },
  { name: 'Polychain Capital', keywords: ['Polychain'] },
  { name: 'Sequoia', keywords: ['Sequoia'] },
  { name: 'Paradigm', keywords: ['Paradigm'] },
];

function getHeaders(xCache, cacheControl = RESPONSE_CACHE_CONTROL) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': cacheControl,
    'X-Cache': xCache,
  };
}

async function fetchWhaleAlerts(options = {}) {
  try {
    const params = new URLSearchParams({
      min_value: options.minValue || '500000',
      limit: '20',
    });

    const url = `${WHALE_API_URL}?${params}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`Whale Alert API: ${response.status}`);

    const data = await response.json();

    return {
      success: true,
      timestamp: new Date().toISOString(),
      whaleTransactions: data.result || [],
    };
  } catch (error) {
    console.error('Whale alerts fetch failed:', error);
    return {
      success: false,
      error: error.message,
      whaleTransactions: [],
    };
  }
}

async function fetchMajorHolders() {
  try {
    // Mock major holders data - in production, integrate with real APIs like CryptoQuant, Glassnode, or Blockchain explorers
    const holders = {
      bitcoin: [
        { address: 'Top Exchange Wallets', balance: 2300000, usdValue: 110000000000, type: 'exchange' },
        { address: 'Grayscale Fund', balance: 600000, usdValue: 28800000000, type: 'trust' },
        { address: 'US Government', balance: 214000, usdValue: 10270000000, type: 'government' },
      ],
      ethereum: [
        { address: 'Lido Staking', balance: 9800000, usdValue: 37000000000, type: 'defi' },
        { address: 'Kraken Withdrawals Wallet', balance: 2400000, usdValue: 9100000000, type: 'exchange' },
      ],
      solana: [
        { address: 'FTX Estate', balance: 44000000, usdValue: 4400000000, type: 'legacy' },
      ],
    };

    return {
      success: true,
      timestamp: new Date().toISOString(),
      holders,
    };
  } catch (error) {
    console.error('Major holders fetch failed:', error);
    return {
      success: false,
      error: error.message,
      holders: {},
    };
  }
}

async function fetchVCMovements() {
  try {
    // Mock VC fund movements - integrate with Messari, CoinGecko portfolios, or company APIs
    const vcMovements = [
      {
        vc: 'a16z crypto',
        portfolio: ['bitcoin', 'ethereum', 'solana'],
        recentActivity: {
          lastUpdate: new Date().toISOString(),
          totalAUM: 8000000000, // $8B AUM
          majorHoldings: ['SOL', 'ETH', 'BTC'],
        },
      },
      {
        vc: 'Polychain Capital',
        portfolio: ['ethereum', 'polkadot', 'cosmos'],
        recentActivity: {
          lastUpdate: new Date().toISOString(),
          totalAUM: 2500000000,
          majorHoldings: ['ETH', 'DOT'],
        },
      },
    ];

    return {
      success: true,
      timestamp: new Date().toISOString(),
      vcMovements,
    };
  } catch (error) {
    console.error('VC movements fetch failed:', error);
    return {
      success: false,
      error: error.message,
      vcMovements: [],
    };
  }
}

export default async function handler(request) {
  const source = new URL(request.url).searchParams.get('source') || 'whales';

  const cacheKey = hashString(`crypto-whale:${source}`);
  const cached = await getCachedJson(cacheKey, CACHE_TTL_SECONDS);

  if (cached) {
    recordCacheTelemetry(cacheKey, true);
    return new Response(JSON.stringify(cached), {
      headers: getHeaders('HIT'),
    });
  }

  let result;

  switch (source) {
    case 'whales':
      result = await fetchWhaleAlerts({ minValue: '250000' });
      break;
    case 'holders':
      result = await fetchMajorHolders();
      break;
    case 'vcs':
      result = await fetchVCMovements();
      break;
    default:
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unknown source. Use: whales, holders, vcs',
        }),
        {
          status: 400,
          headers: getHeaders('MISS'),
        }
      );
  }

  await setCachedJson(cacheKey, result, CACHE_TTL_SECONDS);
  recordCacheTelemetry(cacheKey, false);

  return new Response(JSON.stringify(result), {
    headers: getHeaders('MISS'),
  });
}

import { Panel } from './Panel';
import { fetchWhaleAlerts, fetchMajorCryptoHolders, analyzeWhalePatterns, detectUnusualActivity } from '@/services/crypto-whale';
import type { WhaleTransaction, CryptoHolder } from '@/services/crypto-whale';

export class CryptoWhaleTrackingPanel extends Panel {
  private whaleTransactions: WhaleTransaction[] = [];
  private majorHolders: Record<string, CryptoHolder[]> = {};
  private lastFetch = 0;
  private readonly FETCH_INTERVAL = 120000; // 2 minutes

  constructor() {
    super({
      id: 'crypto-whales',
      title: 'Whale Activity & Major Holders',
      className: 'crypto-whale-panel'
    });
    this.setupContent();
  }

  private setupContent() {
    this.content.innerHTML = `
      <div class="whale-tracking-container">
        <div class="whale-tabs">
          <button class="tab-btn active" data-tab="movements">Whale Movements</button>
          <button class="tab-btn" data-tab="holders">Major Holders</button>
          <button class="tab-btn" data-tab="analysis">Analysis</button>
        </div>

        <!-- Whale Movements Tab -->
        <div class="tab-content" id="movements-tab">
          <div class="unusual-activity-list" id="unusualActivityList">
            <div class="loading">Loading whale alerts...</div>
          </div>
        </div>

        <!-- Major Holders Tab -->
        <div class="tab-content hidden" id="holders-tab">
          <div class="holders-container">
            <div id="holdersContent" class="holders-content">
              <div class="loading">Loading holder data...</div>
            </div>
          </div>
        </div>

        <!-- Analysis Tab -->
        <div class="tab-content hidden" id="analysis-tab">
          <div class="analysis-container">
            <div class="metric-box">
              <div class="metric-label">Buy Pressure</div>
              <div class="metric-value" id="buyPressure">--</div>
              <div class="metric-bar">
                <div class="bar-fill" id="buyBar" style="background: #4caf50;"></div>
              </div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Sell Pressure</div>
              <div class="metric-value" id="sellPressure">--</div>
              <div class="metric-bar">
                <div class="bar-fill" id="sellBar" style="background: #d32f2f;"></div>
              </div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Net Pressure</div>
              <div class="metric-value" id="netPressure">--</div>
              <div class="metric-bar">
                <div class="bar-fill" id="netBar" style="background: #ffa726;"></div>
              </div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Total Volume</div>
              <div class="metric-value" id="totalVolume">$--</div>
            </div>
            <div class="sentiment-box">
              <div class="sentiment-label">Market Sentiment</div>
              <div class="sentiment-badge" id="sentimentBadge">NEUTRAL</div>
            </div>
          </div>
        </div>

        <div class="controls">
          <button id="refreshBtn" class="btn btn-small">Refresh</button>
          <span class="last-updated" id="lastUpdated">Updating...</span>
        </div>

        <style>
          .whale-tracking-container {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 16px;
          }

          .whale-tabs {
            display: flex;
            gap: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 8px;
          }

          .tab-btn {
            padding: 8px 12px;
            background: transparent;
            border: none;
            border-bottom: 2px solid transparent;
            color: #888;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
          }

          .tab-btn:hover {
            color: #ccc;
          }

          .tab-btn.active {
            color: #4caf50;
            border-bottom-color: #4caf50;
          }

          .tab-content {
            display: block;
          }

          .tab-content.hidden {
            display: none;
          }

          .unusual-activity-list {
            max-height: 400px;
            overflow-y: auto;
          }

          .whale-tx {
            background: rgba(0,0,0,0.2);
            border-left: 3px solid #ffa726;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 8px;
            font-size: 12px;
          }

          .whale-tx.buy {
            border-left-color: #4caf50;
          }

          .whale-tx.sell {
            border-left-color: #d32f2f;
          }

          .tx-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
            font-weight: bold;
          }

          .tx-type {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
          }

          .tx-type.buy {
            background: rgba(76,175,80,0.2);
            color: #4caf50;
          }

          .tx-type.sell {
            background: rgba(211,47,47,0.2);
            color: #d32f2f;
          }

          .tx-amount {
            color: #4caf50;
            font-weight: bold;
          }

          .tx-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 11px;
            color: #aaa;
            margin-top: 6px;
          }

          .tx-detail-item {
            word-break: break-all;
          }

          .tx-detail-label {
            color: #888;
            font-size: 10px;
          }

          .holders-content {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .holders-by-asset {
            background: rgba(0,0,0,0.1);
            border-radius: 8px;
            padding: 12px;
          }

          .asset-name {
            font-weight: bold;
            margin-bottom: 10px;
            color: #ffa726;
            font-size: 13px;
          }

          .holder-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            font-size: 12px;
          }

          .holder-item:last-child {
            border-bottom: none;
          }

          .holder-name {
            flex: 1;
          }

          .holder-type {
            padding: 2px 6px;
            background: rgba(255,255,255,0.1);
            border-radius: 3px;
            font-size: 10px;
            margin: 0 8px;
          }

          .holder-value {
            color: #4caf50;
            font-weight: bold;
            min-width: 120px;
            text-align: right;
          }

          .analysis-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .metric-box {
            background: rgba(0,0,0,0.1);
            border-radius: 6px;
            padding: 12px;
          }

          .metric-label {
            font-size: 12px;
            color: #aaa;
            margin-bottom: 6px;
          }

          .metric-value {
            font-size: 18px;
            font-weight: bold;
            color: #4caf50;
            margin-bottom: 8px;
          }

          .metric-bar {
            height: 8px;
            background: rgba(255,255,255,0.05);
            border-radius: 4px;
            overflow: hidden;
          }

          .bar-fill {
            height: 100%;
            transition: width 0.3s;
          }

          .sentiment-box {
            background: rgba(0,0,0,0.2);
            border-radius: 6px;
            padding: 16px;
            text-align: center;
          }

          .sentiment-label {
            font-size: 12px;
            color: #888;
            margin-bottom: 8px;
          }

          .sentiment-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 13px;
            background: rgba(255,167,38,0.2);
            color: #ffa726;
          }

          .sentiment-badge.bullish {
            background: rgba(76,175,80,0.2);
            color: #4caf50;
          }

          .sentiment-badge.bearish {
            background: rgba(211,47,47,0.2);
            color: #d32f2f;
          }

          .loading {
            text-align: center;
            color: #888;
            padding: 20px;
            font-size: 12px;
          }

          .controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: #888;
            border-top: 1px solid rgba(255,255,255,0.1);
            padding-top: 12px;
            margin-top: 8px;
          }

          .btn {
            padding: 6px 12px;
            background: #444;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          }

          .btn:hover {
            background: #555;
          }

          .btn-small {
            padding: 4px 8px;
            font-size: 11px;
          }

          ::-webkit-scrollbar {
            width: 6px;
          }

          ::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.1);
            border-radius: 3px;
          }

          ::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.1);
            border-radius: 3px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.2);
          }
        </style>
      </div>
    `;

    // Tab switching
    const tabs = this.content.querySelectorAll('.tab-btn');
    const contents = this.content.querySelectorAll('.tab-content');

    tabs.forEach((tab: Element) => {
      tab.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        const tabName = target.getAttribute('data-tab');

        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.add('hidden'));

        target.classList.add('active');
        this.content.querySelector(`#${tabName}-tab`)?.classList.remove('hidden');
      });
    });

    // Refresh button
    this.content.querySelector('#refreshBtn')?.addEventListener('click', () => {
      this.refresh();
    });
  }

  async refresh() {
    const now = Date.now();
    if (now - this.lastFetch < this.FETCH_INTERVAL) return;

    this.lastFetch = now;

    // Fetch whale alerts and holders in parallel
    const [whales, holders] = await Promise.all([
      fetchWhaleAlerts(),
      fetchMajorCryptoHolders(),
    ]);

    this.whaleTransactions = whales;
    this.majorHolders = holders;

    this.updateDisplay();
  }

  private updateDisplay() {
    this.updateWhaleMovements();
    this.updateHolders();
    this.updateAnalysis();

    const timeEl = this.content.querySelector('#lastUpdated');
    if (timeEl) {
      timeEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
    }
  }

  private updateWhaleMovements() {
    const list = this.content.querySelector('#unusualActivityList');
    if (!list) return;

    const unusual = detectUnusualActivity(this.whaleTransactions, 500000);
    if (unusual.length === 0) {
      list.innerHTML = '<div class="loading">No unusual whale activity detected</div>';
      return;
    }

    list.innerHTML = unusual
      .slice(0, 10)
      .map(tx => this.formatWhaleTransaction(tx))
      .join('');
  }

  private formatWhaleTransaction(tx: WhaleTransaction): string {
    const isBuy = tx.to.owner && tx.to.owner.includes('Exchange');
    const type = isBuy ? 'BUY' : 'SELL';
    const typeClass = isBuy ? 'buy' : 'sell';
    const amount = (tx.amount_usd / 1e6).toFixed(2);
    const timestamp = new Date(tx.timestamp * 1000).toLocaleString();

    return `
      <div class="whale-tx ${typeClass}">
        <div class="tx-header">
          <span class="tx-type ${typeClass}">${type}</span>
          <span class="tx-amount">$${amount}M</span>
        </div>
        <div class="tx-details">
          <div class="tx-detail-item">
            <div class="tx-detail-label">FROM</div>
            <div>${tx.from.owner || tx.from.address.slice(0, 10)}</div>
          </div>
          <div class="tx-detail-item">
            <div class="tx-detail-label">TO</div>
            <div>${tx.to.owner || tx.to.address.slice(0, 10)}</div>
          </div>
          <div class="tx-detail-item">
            <div class="tx-detail-label">TIME</div>
            <div>${timestamp}</div>
          </div>
          <div class="tx-detail-item">
            <div class="tx-detail-label">CHAIN</div>
            <div>${tx.blockchain.toUpperCase()}</div>
          </div>
        </div>
      </div>
    `;
  }

  private updateHolders() {
    const content = this.content.querySelector('#holdersContent');
    if (!content) return;

    if (Object.keys(this.majorHolders).length === 0) {
      content.innerHTML = '<div class="loading">No holder data available</div>';
      return;
    }

    content.innerHTML = Object.entries(this.majorHolders)
      .map(([asset, holders]) => this.formatHolders(asset, holders))
      .join('');
  }

  private formatHolders(asset: string, holders: CryptoHolder[]): string {
    const assetUpper = asset.charAt(0).toUpperCase() + asset.slice(1);
    const items = holders
      .slice(0, 5)
      .map(h => {
        const value = (h.usdValue / 1e9).toFixed(1);
        return `
          <div class="holder-item">
            <div class="holder-name">${h.alias || 'Unknown'}</div>
            <div class="holder-type">${h.type}</div>
            <div class="holder-value">$${value}B</div>
          </div>
        `;
      })
      .join('');

    return `
      <div class="holders-by-asset">
        <div class="asset-name">${assetUpper}</div>
        ${items}
      </div>
    `;
  }

  private updateAnalysis() {
    if (this.whaleTransactions.length === 0) return;

    const analysis = analyzeWhalePatterns(this.whaleTransactions);

    const buyEl = this.content.querySelector('#buyPressure');
    const sellEl = this.content.querySelector('#sellPressure');
    const netEl = this.content.querySelector('#netPressure');
    const volEl = this.content.querySelector('#totalVolume');

    if (buyEl) buyEl.textContent = analysis.buyPressure.toString();
    if (sellEl) sellEl.textContent = analysis.sellPressure.toString();
    if (netEl) netEl.textContent = (analysis.netPressure >= 0 ? '+' : '') + analysis.netPressure.toString();
    if (volEl) volEl.textContent = `$${(analysis.totalVolumeUsd / 1e6).toFixed(1)}M`;

    // Update bars
    const maxPressure = Math.max(analysis.buyPressure, analysis.sellPressure, 1);
    const buyBar = this.content.querySelector('#buyBar') as HTMLElement;
    const sellBar = this.content.querySelector('#sellBar') as HTMLElement;

    if (buyBar) buyBar.style.width = `${(analysis.buyPressure / maxPressure) * 100}%`;
    if (sellBar) sellBar.style.width = `${(analysis.sellPressure / maxPressure) * 100}%`;

    // Update sentiment
    const sentimentBadge = this.content.querySelector('#sentimentBadge');
    if (sentimentBadge) {
      sentimentBadge.textContent = analysis.sentiment.toUpperCase();
      sentimentBadge.className = `sentiment-badge ${analysis.sentiment}`;
    }
  }
}

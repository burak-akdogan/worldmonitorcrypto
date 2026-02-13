import { Panel } from './Panel';
import { fetchCryptoFearMeter } from '@/services/crypto-fear';
import type { CryptoFearMeter } from '@/services/crypto-fear';

export class CryptoFearMeterPanel extends Panel {
  private fearMeter: CryptoFearMeter | null = null;
  private fearHistory: CryptoFearMeter[] = [];
  private lastFetch = 0;
  private readonly FETCH_INTERVAL = 60000; // 1 minute

  constructor() {
    super({
      id: 'crypto-fear-meter',
      title: 'Crypto Fear Meter',
      className: 'crypto-fear-meter-panel',
    });
    this.setupContent();
  }

  private setupContent() {
    this.content.innerHTML = `
      <div class="fear-meter-container">
        <div class="fear-gauge">
          <svg viewBox="0 0 300 150" class="fear-gauge-svg">
            <!-- Gauge background -->
            <path d="M 50 130 A 80 80 0 0 1 250 130" stroke="#333" stroke-width="20" fill="none" />
            
            <!-- Fear zones -->
            <path d="M 50 130 A 80 80 0 0 1 110 65" stroke="#d32f2f" stroke-width="20" fill="none" class="fear-zone-extreme" />
            <path d="M 110 65 A 80 80 0 0 1 150 30" stroke="#f57c00" stroke-width="20" fill="none" class="fear-zone-high" />
            <path d="M 150 30 A 80 80 0 0 1 190 65" stroke="#ffa726" stroke-width="20" fill="none" class="fear-zone-moderate" />
            <path d="M 190 65 A 80 80 0 0 1 250 130" stroke="#4caf50" stroke-width="20" fill="none" class="fear-zone-greed" />
            
            <!-- Needle -->
            <g class="fear-needle" transform="translate(150, 130)">
              <line x1="0" y1="0" x2="0" y2="-70" stroke="white" stroke-width="3" stroke-linecap="round" />
              <circle cx="0" cy="0" r="5" fill="white" />
            </g>
          </svg>
          <div class="fear-score-display">
            <span class="score" id="fearScore">--</span>
            <span class="label">/100</span>
          </div>
        </div>

        <div class="fear-status-box">
          <div class="status-header">
            <span class="emoji" id="fearEmoji">😐</span>
            <span class="status-text" id="fearLevel">MODERATE FEAR</span>
          </div>
          <div class="status-color" id="statusColor" style="background: #ffa726; height: 4px;"></div>
        </div>

        <div class="components-breakdown">
          <h4>Fear Components</h4>
          <div class="component-item">
            <div class="component-label">FNG Index</div>
            <div class="component-bar">
              <div class="bar-fill" id="fngBar" style="width: 50%;"></div>
            </div>
            <span class="component-value" id="fngValue">50</span>
          </div>
          <div class="component-item">
            <div class="component-label">Volatility</div>
            <div class="component-bar">
              <div class="bar-fill" id="volBar" style="width: 50%;"></div>
            </div>
            <span class="component-value" id="volValue">50</span>
          </div>
          <div class="component-item">
            <div class="component-label">Whale Activity</div>
            <div class="component-bar">
              <div class="bar-fill" id="whaleBar" style="width: 50%;"></div>
            </div>
            <span class="component-value" id="whaleValue">50</span>
          </div>
          <div class="component-item">
            <div class="component-label">Regulatory Risk</div>
            <div class="component-bar">
              <div class="bar-fill" id="regBar" style="width: 50%;"></div>
            </div>
            <span class="component-value" id="regValue">50</span>
          </div>
          <div class="component-item">
            <div class="component-label">Liquidations</div>
            <div class="component-bar">
              <div class="bar-fill" id="liqBar" style="width: 50%;"></div>
            </div>
            <span class="component-value" id="liqValue">50</span>
          </div>
        </div>

        <div class="recommendations">
          <h4>Signals & Recommendations</h4>
          <div class="trend-indicator">
            <span id="trend">●</span>
            <span id="trendText">Neutral</span>
          </div>
          <ul id="recommendationsList" class="recommendations-list"></ul>
        </div>

        <div class="controls">
          <button id="refreshBtn" class="btn btn-small">Refresh</button>
          <span class="last-updated" id="lastUpdated">Updating...</span>
        </div>
      </div>

      <style>
        .fear-meter-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 16px;
        }

        .fear-zone-extreme, .fear-zone-high, .fear-zone-moderate, .fear-zone-greed { opacity: 0.8; }
        
        .fear-gauge { position: relative; width: 100%; max-width: 300px; margin: 0 auto; }
        .fear-gauge-svg { width: 100%; height: auto; }
        .fear-needle { transition: transform 0.5s ease-out; }
        .fear-score-display { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; font-weight: bold; }
        .fear-score-display .score { font-size: 32px; display: block; }
        .fear-score-display .label { font-size: 12px; color: #888; }
        
        .fear-status-box { background: rgba(0,0,0,0.2); border-radius: 8px; padding: 12px; }
        .status-header { display: flex; align-items: center; gap: 10px; font-weight: bold; }
        .emoji { font-size: 24px; }
        
        .components-breakdown { background: rgba(0,0,0,0.1); border-radius: 8px; padding: 12px; }
        .components-breakdown h4 { margin: 0 0 12px 0; font-size: 14px; color: #ccc; }
        .component-item { display: grid; grid-template-columns: 100px 1fr 40px; gap: 8px; align-items: center; margin-bottom: 8px; font-size: 12px; }
        .component-label { font-weight: 500; color: #bbb; }
        .component-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
        .bar-fill { height: 100%; background: linear-gradient(90deg, #4caf50, #f57c00, #d32f2f); transition: width 0.3s; }
        .component-value { text-align: right; color: #888; }
        
        .recommendations h4 { margin: 0 0 10px 0; font-size: 14px; color: #ccc; }
        .trend-indicator { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; font-size: 13px; }
        .trend-indicator span:first-child { font-size: 20px; }
        .recommendations-list { list-style: none; padding: 0; margin: 0; }
        .recommendations-list li { padding: 6px 0 6px 16px; position: relative; font-size: 12px; color: #aaa; line-height: 1.4; }
        .recommendations-list li:before { content: "→"; position: absolute; left: 0; color: #4caf50; }
        
        .controls { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #888; }
        .btn { padding: 6px 12px; background: #444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .btn:hover { background: #555; }
        .btn-small { padding: 4px 8px; font-size: 11px; }
      </style>
    `;

    this.content.querySelector('#refreshBtn')?.addEventListener('click', () => {
      this.refresh();
    });
  }

  async refresh() {
    const now = Date.now();
    if (now - this.lastFetch < this.FETCH_INTERVAL && this.fearMeter) return;

    this.lastFetch = now;
    const meter = await fetchCryptoFearMeter();

    if (!meter) {
      this.content.querySelector('#lastUpdated')!.textContent = 'Failed to fetch';
      return;
    }

    this.fearMeter = meter;
    this.fearHistory.push(meter);
    if (this.fearHistory.length > 100) this.fearHistory.shift();

    this.updateDisplay();
  }

  private updateDisplay() {
    if (!this.fearMeter) return;

    const { fearScore, fearStatus, components, signals } = this.fearMeter;

    const scoreEl = this.content.querySelector('#fearScore');
    if (scoreEl) scoreEl.textContent = fearScore.toString();

    const angle = (fearScore / 100) * 180 - 90;
    const needle = this.content.querySelector('.fear-needle');
    if (needle) {
      (needle as SVGElement).style.transform = `rotate(${angle}deg)`;
    }

    const levelEl = this.content.querySelector('#fearLevel');
    const emojiEl = this.content.querySelector('#fearEmoji');
    const colorEl = this.content.querySelector('#statusColor');

    if (levelEl) levelEl.textContent = fearStatus.level;
    if (emojiEl) emojiEl.textContent = fearStatus.emoji;
    if (colorEl) (colorEl as HTMLElement).style.backgroundColor = fearStatus.color;

    if (components.alternativeFng !== null) {
      const fngBar = this.content.querySelector('#fngBar') as HTMLElement;
      if (fngBar) fngBar.style.width = `${components.alternativeFng}%`;
      const fngValue = this.content.querySelector('#fngValue');
      if (fngValue) fngValue.textContent = components.alternativeFng.toString();
    }

    this.updateComponentBar('vol', components.volatility);
    this.updateComponentBar('whale', components.whaleActivity);
    this.updateComponentBar('reg', components.regulatory);
    this.updateComponentBar('liq', components.liquidations);

    const trendEl = this.content.querySelector('#trendText');
    if (trendEl) {
      const trendColor = signals.trend === 'bullish' ? '#4caf50' : signals.trend === 'bearish' ? '#d32f2f' : '#ffa726';
      trendEl.textContent = signals.trend.toUpperCase();
      (trendEl as HTMLElement).style.color = trendColor;

      const trendDot = this.content.querySelector('#trend');
      if (trendDot) (trendDot as HTMLElement).style.color = trendColor;
    }

    const recList = this.content.querySelector('#recommendationsList');
    if (recList) {
      recList.innerHTML = signals.recommendations
        .slice(0, 3)
        .map(rec => `<li>${rec}</li>`)
        .join('');
    }

    const timeEl = this.content.querySelector('#lastUpdated');
    if (timeEl) {
      const date = new Date(this.fearMeter.timestamp);
      timeEl.textContent = `Updated ${date.toLocaleTimeString()}`;
    }
  }

  private updateComponentBar(id: string, value: number) {
    const bar = this.content.querySelector(`#${id}Bar`) as HTMLElement;
    const valueEl = this.content.querySelector(`#${id}Value`);
    if (bar) bar.style.width = `${value}%`;
    if (valueEl) valueEl.textContent = value.toString();
  }
}

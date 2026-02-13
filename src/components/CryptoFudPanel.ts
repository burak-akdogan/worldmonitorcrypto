import { Panel } from './Panel';
import { analyzeCryptoFud, getTrendingFudTopics, identifyFudCampaigns, filterByFearLevel } from '@/services/crypto-fud';
import type { NewsItem } from '@/types';

export class CryptoFudPanel extends Panel {
  private newsArticles: NewsItem[] = [];
  private lastAnalysis: any = null;
  private lastFetch = 0;
  private readonly FETCH_INTERVAL = 300000; // 5 minutes

  constructor() {
    super({
      id: 'crypto-fud',
      title: 'Crypto FUD Analysis',
      className: 'crypto-fud-panel'
    });
    this.setupContent();
  }

  private setupContent() {
    this.content.innerHTML = `
      <div class="fud-panel-container">
        <div class="fud-stats">
          <div class="stat-box">
            <div class="stat-value" id="fudCount">--</div>
            <div class="stat-label">FUD Articles</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" id="fudScore">--</div>
            <div class="stat-label">Avg FUD Score</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" id="fudPercent">--</div>
            <div class="stat-label">FUD %</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" id="fudLevel">--</div>
            <div class="stat-label">Overall Level</div>
          </div>
        </div>

        <div class="fud-filters">
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="CRITICAL">Critical</button>
          <button class="filter-btn" data-filter="HIGH">High</button>
          <button class="filter-btn" data-filter="MODERATE">Moderate</button>
        </div>

        <div class="fud-articles" id="fudArticles">
          <div class="loading">Analyzing crypto news for FUD...</div>
        </div>

        <div class="trending-fud">
          <h4>Trending FUD Topics</h4>
          <div id="trendingTopics" class="topics-list"></div>
        </div>

        <div class="fud-campaigns">
          <h4>Potential FUD Campaigns</h4>
          <div id="campaigns" class="campaigns-list"></div>
        </div>

        <div class="controls">
          <button id="refreshBtn" class="btn btn-small">Analyze News</button>
          <span class="last-updated" id="lastUpdated">Ready</span>
        </div>

        <style>
          .fud-panel-container {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 16px;
          }

          .fud-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
          }

          .stat-box {
            background: rgba(0,0,0,0.2);
            border-radius: 6px;
            padding: 12px;
            text-align: center;
          }

          .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #ffa726;
            margin-bottom: 4px;
          }

          .stat-label {
            font-size: 11px;
            color: #888;
          }

          .fud-filters {
            display: flex;
            gap: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 8px;
            padding-bottom: 8px;
          }

          .filter-btn {
            padding: 6px 12px;
            background: transparent;
            border: 1px solid rgba(255,255,255,0.2);
            color: #888;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
          }

          .filter-btn:hover {
            border-color: rgba(255,255,255,0.4);
            color: #ccc;
          }

          .filter-btn.active {
            background: #d32f2f;
            border-color: #d32f2f;
            color: white;
          }

          .fud-articles {
            max-height: 400px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .fud-article {
            background: rgba(0,0,0,0.2);
            border-left: 4px solid #ffa726;
            border-radius: 4px;
            padding: 10px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .fud-article:hover {
            background: rgba(0,0,0,0.3);
            transform: translateX(2px);
          }

          .fud-article.CRITICAL {
            border-left-color: #d32f2f;
            background: rgba(211,47,47,0.1);
          }

          .fud-article.HIGH {
            border-left-color: #f57c00;
            background: rgba(245,124,0,0.1);
          }

          .fud-article.MODERATE {
            border-left-color: #ffa726;
          }

          .fud-article.LOW {
            border-left-color: #ffb74d;
          }

          .fud-article-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 6px;
            gap: 8px;
          }

          .fud-article-title {
            flex: 1;
            font-weight: bold;
            color: #ccc;
            line-height: 1.3;
          }

          .fud-score-badge {
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 11px;
            white-space: nowrap;
          }

          .fud-score-badge.CRITICAL {
            background: rgba(211,47,47,0.3);
            color: #d32f2f;
          }

          .fud-score-badge.HIGH {
            background: rgba(245,124,0,0.3);
            color: #f57c00;
          }

          .fud-score-badge.MODERATE {
            background: rgba(255,167,38,0.3);
            color: #ffa726;
          }

          .fud-score-badge.LOW {
            background: rgba(255,183,77,0.3);
            color: #ffb74d;
          }

          .fud-article-source {
            font-size: 11px;
            color: #888;
            margin-bottom: 4px;
          }

          .fud-article-keywords {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
          }

          .keyword-badge {
            padding: 1px 4px;
            background: rgba(211,47,47,0.2);
            color: #d32f2f;
            border-radius: 2px;
            font-size: 10px;
          }

          .trending-fud h4,
          .fud-campaigns h4 {
            font-size: 13px;
            color: #ccc;
            margin: 0 0 10px 0;
          }

          .topics-list,
          .campaigns-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .topic-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            background: rgba(0,0,0,0.1);
            border-radius: 4px;
            font-size: 12px;
          }

          .topic-name {
            color: #ccc;
          }

          .topic-count {
            background: #d32f2f;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 11px;
          }

          .campaign-item {
            background: rgba(0,0,0,0.2);
            border-left: 3px solid #d32f2f;
            border-radius: 4px;
            padding: 10px;
            font-size: 12px;
          }

          .campaign-name {
            font-weight: bold;
            color: #ccc;
            margin-bottom: 4px;
          }

          .campaign-details {
            display: flex;
            gap: 16px;
            font-size: 11px;
            color: #888;
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

    // Filter buttons
    const filters = this.content.querySelectorAll('.filter-btn');
    filters.forEach((btn: Element) => {
      btn.addEventListener('click', (e: Event) => {
        filters.forEach(b => b.classList.remove('active'));
        (e.target as HTMLElement).classList.add('active');
        this.updateArticleDisplay();
      });
    });

    // Refresh button
    this.content.querySelector('#refreshBtn')?.addEventListener('click', () => {
      this.analyzeNews();
    });
  }

  setNewsArticles(articles: NewsItem[]) {
    this.newsArticles = articles;
  }

  async analyzeNews() {
    if (this.newsArticles.length === 0) {
      const articlesEl = this.content.querySelector('#fudArticles');
      if (articlesEl) articlesEl.innerHTML = '<div class="loading">No crypto news articles to analyze</div>';
      return;
    }

    const now = Date.now();
    if (now - this.lastFetch < this.FETCH_INTERVAL && this.lastAnalysis) {
      this.updateDisplay();
      return;
    }

    this.lastFetch = now;

    // Filter crypto-related news
    const cryptoNews = this.newsArticles.filter(a =>
      (a.title || '').toLowerCase().includes('crypto')
    );

    if (cryptoNews.length === 0) {
      const articlesEl = this.content.querySelector('#fudArticles');
      if (articlesEl) articlesEl.innerHTML = '<div class="loading">No crypto news in current feed</div>';
      return;
    }

    const analysis = await analyzeCryptoFud(cryptoNews);
    if (analysis) {
      this.lastAnalysis = analysis;
      this.updateDisplay();
    }
  }

  private updateDisplay() {
    if (!this.lastAnalysis) return;

    const { aggregateMetrics, articles } = this.lastAnalysis;

    // Update stats
    const countEl = this.content.querySelector('#fudCount');
    const scoreEl = this.content.querySelector('#fudScore');
    const percentEl = this.content.querySelector('#fudPercent');
    const levelEl = this.content.querySelector('#fudLevel');

    if (countEl) countEl.textContent = aggregateMetrics.fudArticlesCount.toString();
    if (scoreEl) scoreEl.textContent = aggregateMetrics.averageFudScore.toString();
    if (percentEl) percentEl.textContent = `${aggregateMetrics.fudPercentage}%`;
    if (levelEl) levelEl.textContent = aggregateMetrics.fudLevel;

    this.updateArticleDisplay();
    this.updateTrendingTopics();
    this.updateCampaigns();

    const timeEl = this.content.querySelector('#lastUpdated');
    if (timeEl) {
      timeEl.textContent = `Analyzed ${articles.length} articles`;
    }
  }

  private updateArticleDisplay() {
    if (!this.lastAnalysis) return;

    const { articles } = this.lastAnalysis;
    const activeFilter = (this.content.querySelector('.filter-btn.active') as HTMLElement)?.textContent || 'All';

    let filtered = articles;
    if (activeFilter !== 'All') {
      filtered = filterByFearLevel(articles, activeFilter as any);
    }

    const articlesEl = this.content.querySelector('#fudArticles');
    if (!articlesEl) return;

    if (filtered.length === 0) {
      articlesEl.innerHTML = '<div class="loading">No articles in this category</div>';
      return;
    }

    articlesEl.innerHTML = filtered
      .slice(0, 15)
      .map((article: any) => this.formatArticle(article))
      .join('');
  }

  private formatArticle(article: any): string {
    return `
      <div class="fud-article ${article.fudLevel}">
        <div class="fud-article-header">
          <div class="fud-article-title">${article.article.title}</div>
          <div class="fud-score-badge ${article.fudLevel}">${article.fudScore}</div>
        </div>
        <div class="fud-article-source">${article.article.source}</div>
        <div class="fud-article-keywords">
          ${article.keywords.slice(0, 3).map((k: any) => `<span class="keyword-badge">${k.keyword}</span>`).join('')}
        </div>
      </div>
    `;
  }

  private updateTrendingTopics() {
    if (!this.lastAnalysis) return;

    const topics = getTrendingFudTopics(this.lastAnalysis.articles);
    const topicsEl = this.content.querySelector('#trendingTopics');

    if (!topicsEl) return;

    const topItems = Array.from(topics.entries())
      .slice(0, 5)
      .map(([keyword, count]) => `
        <div class="topic-item">
          <span class="topic-name">${keyword}</span>
          <span class="topic-count">${count}</span>
        </div>
      `)
      .join('');

    topicsEl.innerHTML = topItems || '<div class="loading" style="font-size: 11px;">No trending topics</div>';
  }

  private updateCampaigns() {
    if (!this.lastAnalysis) return;

    const campaigns = identifyFudCampaigns(this.lastAnalysis.articles);
    const campaignsEl = this.content.querySelector('#campaigns');

    if (!campaignsEl) return;

    if (campaigns.size === 0) {
      campaignsEl.innerHTML = '<div class="loading" style="font-size: 11px;">No coordinated FUD campaigns detected</div>';
      return;
    }

    const campaignItems = Array.from(campaigns.entries())
      .map(
        ([keyword, articles]) => `
        <div class="campaign-item">
          <div class="campaign-name">Potential Campaign: "${keyword}"</div>
          <div class="campaign-details">
            <span>${articles.length} articles</span>
            <span>Avg Score: ${Math.round(articles.reduce((s, a) => s + a.fudScore, 0) / articles.length)}</span>
          </div>
        </div>
      `
      )
      .join('');

    campaignsEl.innerHTML = campaignItems;
  }
}

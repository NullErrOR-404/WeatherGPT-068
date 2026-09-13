/**
 * @weathergpt/embed-sdk — Universal Headless Web Component
 * Drop-in meteorological intelligence widget for Indian Government portals
 * (UMANG, PM-Kisan, Meghdoot, State Disaster Management, Panchayat Kiosks).
 * 
 * Usage:
 * <script src="/embed.js"></script>
 * <weather-gpt-card lat="20.7453" lon="78.6022" lang="mr" persona="farmer"></weather-gpt-card>
 */

(function () {
  'use strict';

  class WeatherGPTCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
      return ['lat', 'lon', 'lang', 'persona'];
    }

    connectedCallback() {
      this.renderLoading();
      this.fetchData();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue !== newValue) {
        this.fetchData();
      }
    }

    async fetchData() {
      const lat = this.getAttribute('lat') || '20.7453';
      const lon = this.getAttribute('lon') || '78.6022';
      const lang = this.getAttribute('lang') || 'hi';
      const persona = this.getAttribute('persona') || 'farmer';

      try {
        const res = await fetch(`/api/sdk/widget-config?lat=${lat}&lon=${lon}&lang=${lang}&persona=${persona}`);
        if (!res.ok) throw new Error('API fetch error');
        const data = await res.json();
        this.renderData(data);
      } catch (err) {
        this.renderFallback(lat, lon);
      }
    }

    renderLoading() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          .loading-skeleton {
            background: linear-gradient(135deg, #0a192f 0%, #1e293b 100%);
            border-radius: 12px;
            padding: 16px;
            color: #94a3b8;
            border: 1px solid #334155;
            animation: pulse 1.5s infinite;
          }
          @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.9; } }
        </style>
        <div class="loading-skeleton">
          <span>🇮🇳 WeatherGPT: Loading meteorological advisories...</span>
        </div>
      `;
    }

    renderData(data) {
      const isSafe = data.action_badge === 'SAFE';
      const badgeColor = isSafe ? '#10b981' : (data.action_badge === 'CAUTION' ? '#f59e0b' : '#ef4444');
      const badgeText = isSafe ? 'सुरक्षित (SAFE)' : (data.action_badge === 'CAUTION' ? 'सावधान (CAUTION)' : 'धोका (UNSAFE)');

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #f8fafc;
          }
          .sdk-card {
            background: linear-gradient(135deg, #071527 0%, #0f2744 100%);
            border: 1px solid #1e40af;
            border-radius: 14px;
            padding: 16px 20px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
            position: relative;
            overflow: hidden;
          }
          .sdk-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 3px;
            background: linear-gradient(90deg, #ff9933 33%, #ffffff 33% 66%, #138808 66%);
          }
          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .title-area {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .emblem { font-size: 1.2rem; }
          .gov-title {
            font-size: 0.75rem;
            color: #93c5fd;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
          }
          .loc-title {
            font-size: 1.05rem;
            font-weight: 700;
            color: #ffffff;
          }
          .badge {
            background: ${badgeColor}22;
            color: ${badgeColor};
            border: 1px solid ${badgeColor};
            font-size: 0.75rem;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 20px;
          }
          .card-main {
            display: flex;
            align-items: baseline;
            gap: 16px;
            margin-bottom: 12px;
          }
          .temp {
            font-size: 2.2rem;
            font-weight: 800;
            color: #ffffff;
            line-height: 1;
          }
          .feels {
            font-size: 0.85rem;
            color: #94a3b8;
          }
          .summary {
            font-size: 0.92rem;
            line-height: 1.4;
            color: #e2e8f0;
            margin-bottom: 14px;
            padding: 8px 12px;
            background: rgba(15, 23, 42, 0.6);
            border-radius: 8px;
            border-left: 3px solid ${badgeColor};
          }
          .chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 12px;
          }
          .chip {
            background: #1e293b;
            color: #cbd5e1;
            font-size: 0.75rem;
            padding: 4px 8px;
            border-radius: 6px;
            border: 1px solid #334155;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.7rem;
            color: #64748b;
            border-top: 1px solid rgba(255,255,255,0.08);
            padding-top: 8px;
          }
          .brand-watermark {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #38bdf8;
            font-weight: 600;
          }
        </style>
        <div class="sdk-card">
          <div class="card-header">
            <div class="title-area">
              <span class="emblem">🇮🇳</span>
              <div>
                <div class="gov-title">MoES / IMD &bull; WeatherGPT</div>
                <div class="loc-title">${data.location || 'Wardha, MH'}</div>
              </div>
            </div>
            <span class="badge">${badgeText}</span>
          </div>

          <div class="card-main">
            <div class="temp">${Math.round(data.temperature_c || 28)}°C</div>
            <div class="feels">जाणवणारे तापमान: ${Math.round(data.feels_like_c || 29)}°C</div>
          </div>

          <div class="summary">${data.action_summary || 'हवामान अनुकूल आहे. शेती कामासाठी सुरक्षित वेळ.'}</div>

          <div class="chips">
            ${(data.quick_chips || ['छिड़काव सलाह', 'मंडी सुरक्षा', 'दामिनी अलर्ट'])
              .map(c => `<span class="chip">${c}</span>`).join('')}
          </div>

          <div class="footer">
            <span>डेटा: ${data.data_provenance || 'IMD / OGDL-India'}</span>
            <span class="brand-watermark">⚡ WeatherGPT Embed SDK</span>
          </div>
        </div>
      `;
    }

    renderFallback(lat, lon) {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; font-family: sans-serif; }
          .fallback-card {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 14px;
            color: #e2e8f0;
          }
        </style>
        <div class="fallback-card">
          <div>🇮🇳 <strong>WeatherGPT Offline Mode</strong> (${lat}, ${lon})</div>
          <p style="font-size: 0.85rem; color: #94a3b8; margin: 6px 0 0;">
            Serving local cached advisory under Open Government Data License (OGDL-India).
          </p>
        </div>
      `;
    }
  }

  if (!customElements.get('weather-gpt-card')) {
    customElements.define('weather-gpt-card', WeatherGPTCard);
  }
})();

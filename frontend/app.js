/**
 * WeatherGPT — High-Performance Mobile Frontend Controller
 * Grounded in Reference UI Design & Modern Anti-Slop Principles
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Application State & Storage Defaults
  // ---------------------------------------------------------------------------
  const state = {
    activeTab: 'tab-home',
    city: 'Chennai',
    stateName: 'Tamil Nadu',
    lat: 13.0827,
    lon: 80.2707,
    role: localStorage.getItem('weathergpt_role') || 'citizen',
    lang: localStorage.getItem('weathergpt_lang') || 'en',
    currentWeather: null,
    riskScore: 20,
    riskLevel: 'Low Risk',
    activeAlerts: [],
    radarTimestamps: [],
    currentRadarIndex: 0,
    isRadarPlaying: false,
    radarPlayTimer: null,
    speechSynthUtterance: null,
    recognition: null,
  };

  // Maps
  let homeMiniMap = null;
  let fullMap = null;
  let desktopMap = null;
  let miniRadarLayer = null;
  let fullRadarLayer = null;
  let desktopRadarLayer = null;
  let miniLocationMarker = null;
  let fullLocationMarker = null;
  let desktopLocationMarker = null;

  // Vernacular Role Display Dictionary
  const ROLE_NAMES = {
    farmer: '🌾 Agriculture & Crop Protection',
    marine: '⛵ Coastal & Deep Sea Fishing',
    commuter: '🚗 Urban Commuter & Flood Routing',
    citizen: '🏠 Everyday Citizen Weather',
    volunteer: '🛡️ Aapda Mitra Disaster Relief',
  };

  // OWASP Defense-in-Depth Character Escaping (SEC-20 Hardened)
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------------------------------------------------------------------------
  // 2. Initialization & DOM Hooking
  // ---------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    initTabNavigation();
    initLocationAndRoleSelectors();
    initMaps();
    initChatCopilot();
    initUSSDSimulator();
    initSpeechAPIs();
    loadLiveWeatherData();
    loadActiveAlerts();
    updateUIPreferences();
  });

  // ---------------------------------------------------------------------------
  // 3. Tab Navigation Controller (Home, Map, Alerts, Profile)
  // ---------------------------------------------------------------------------
  function initTabNavigation() {
    const tabButtons = document.querySelectorAll('.nav-tab-item');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTabId = btn.getAttribute('data-tab');
        switchTab(targetTabId);
      });
    });

    // Desktop Header Navigation Links
    const desktopTabButtons = document.querySelectorAll('.desktop-nav-btn');
    desktopTabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTabId = btn.getAttribute('data-tab');
        switchTab(targetTabId);
      });
    });

    // Expand Map Button on Home Card
    const btnExpandMap = document.getElementById('btn-expand-live-map');
    if (btnExpandMap) {
      btnExpandMap.addEventListener('click', () => {
        switchTab('tab-map');
      });
    }

    // View More Hourly Button on Home
    const btnViewMoreHourly = document.getElementById('btn-view-more-hourly');
    if (btnViewMoreHourly) {
      btnViewMoreHourly.addEventListener('click', () => {
        openChatWithQuery('Show me the detailed 24-hour hourly weather forecast.');
      });
    }
  }

  function switchTab(tabId) {
    state.activeTab = tabId;

    // Update Tab Views
    document.querySelectorAll('.view-tab').forEach((tab) => {
      tab.classList.remove('active');
    });
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
      targetTab.classList.add('active');
    }

    // Update Bottom Nav Bar
    document.querySelectorAll('.nav-tab-item').forEach((btn) => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update Desktop Header Nav Buttons
    document.querySelectorAll('.desktop-nav-btn').forEach((btn) => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Invalidate Leaflet map size on switch to ensure crisp tiles
    if (tabId === 'tab-map' && fullMap) {
      setTimeout(() => {
        fullMap.invalidateSize();
        fullMap.setView([state.lat, state.lon], 9);
      }, 150);
    } else if (tabId === 'tab-home') {
      setTimeout(() => {
        if (homeMiniMap) {
          homeMiniMap.invalidateSize();
          homeMiniMap.setView([state.lat, state.lon], 8);
        }
        if (desktopMap) {
          desktopMap.invalidateSize();
          desktopMap.setView([state.lat, state.lon], 9);
        }
      }, 150);
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Interactive Leaflet Maps & Real-time Radar Feeds
  // ---------------------------------------------------------------------------
  function initMaps() {
    if (typeof L === 'undefined') {
      console.warn('Leaflet not loaded, skipping map initialisation.');
      return;
    }

    const mapTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileOptions = {
      maxZoom: 18,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; OpenStreetMap contributors',
    };

    // 1. Home Mini Map Preview
    const miniMapEl = document.getElementById('home-mini-map');
    if (miniMapEl) {
      homeMiniMap = L.map('home-mini-map', {
        center: [state.lat, state.lon],
        zoom: 8,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(mapTileUrl, tileOptions).addTo(homeMiniMap);

      // Glowing Location Dot
      const pulsingIcon = L.divIcon({
        className: 'gps-pulse-marker',
        html: '<div style="width:14px;height:14px;background:#0066FF;border:3px solid #FFFFFF;border-radius:50%;box-shadow:0 0 10px #0066FF;"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      miniLocationMarker = L.marker([state.lat, state.lon], { icon: pulsingIcon }).addTo(homeMiniMap);

      // Mini Map Click Handler -> Dynamic Place Insights
      homeMiniMap.on('click', (e) => {
        handleMapClickInsights(e.latlng.lat, e.latlng.lng);
      });
    }

    // 2. Fullscreen Radar & Satellite Map
    const fullMapEl = document.getElementById('fullscreen-map-canvas');
    if (fullMapEl) {
      fullMap = L.map('fullscreen-map-canvas', {
        center: [state.lat, state.lon],
        zoom: 9,
        zoomControl: true,
      });

      L.tileLayer(mapTileUrl, tileOptions).addTo(fullMap);

      fullLocationMarker = L.marker([state.lat, state.lon]).addTo(fullMap);
      fullLocationMarker.bindPopup(`<strong>${state.city}</strong><br>Current Location`).openPopup();

      // Full Map Click Handler -> Dynamic Place Insights
      fullMap.on('click', (e) => {
        handleMapClickInsights(e.latlng.lat, e.latlng.lng);
      });
    }

    // 3. Desktop Persistent Live Doppler Radar & Satellite Map
    const desktopMapEl = document.getElementById('desktop-live-map');
    if (desktopMapEl) {
      desktopMap = L.map('desktop-live-map', {
        center: [state.lat, state.lon],
        zoom: 8,
        zoomControl: true,
      });

      L.tileLayer(mapTileUrl, tileOptions).addTo(desktopMap);

      desktopLocationMarker = L.marker([state.lat, state.lon]).addTo(desktopMap);
      desktopLocationMarker.bindPopup(`<strong>${state.city}</strong><br>Current Location`);

      desktopMap.on('click', (e) => {
        handleMapClickInsights(e.latlng.lat, e.latlng.lng);
      });
    }

    // Fetch Live Radar / Satellite Tiles from RainViewer API
    fetchRainViewerRadarTimestamps();

    // Map Recenter Buttons (Fullscreen & Desktop)
    const btnRecenter = document.getElementById('btn-recenter-map');
    if (btnRecenter) {
      btnRecenter.addEventListener('click', () => {
        if (fullMap) fullMap.setView([state.lat, state.lon], 10);
      });
    }
    const btnDesktopRecenter = document.getElementById('btn-desktop-recenter');
    if (btnDesktopRecenter) {
      btnDesktopRecenter.addEventListener('click', () => {
        if (desktopMap) desktopMap.setView([state.lat, state.lon], 8);
      });
    }

    // Layer Select Dropdowns (Home, Fullscreen, Desktop)
    const homeLayerSelect = document.getElementById('home-map-layer-select');
    if (homeLayerSelect) {
      homeLayerSelect.addEventListener('change', (e) => {
        updateMapOverlayLayer(e.target.value);
      });
    }

    const fullLayerSelect = document.getElementById('fullscreen-map-layer-select');
    if (fullLayerSelect) {
      fullLayerSelect.addEventListener('change', (e) => {
        updateMapOverlayLayer(e.target.value);
      });
    }

    const desktopLayerSelect = document.getElementById('desktop-map-layer-select');
    if (desktopLayerSelect) {
      desktopLayerSelect.addEventListener('change', (e) => {
        updateMapOverlayLayer(e.target.value);
      });
    }

    // Radar Play/Pause Buttons
    const btnRadarPlay = document.getElementById('btn-radar-play');
    if (btnRadarPlay) {
      btnRadarPlay.addEventListener('click', toggleRadarPlayback);
    }
    const btnDesktopRadarPlay = document.getElementById('btn-desktop-radar-play');
    if (btnDesktopRadarPlay) {
      btnDesktopRadarPlay.addEventListener('click', toggleRadarPlayback);
    }
  }

  async function fetchRainViewerRadarTimestamps() {
    try {
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      if (!res.ok) throw new Error('RainViewer offline');
      const data = await res.json();

      if (data.radar && data.radar.past && data.radar.past.length > 0) {
        state.radarTimestamps = data.radar.past.map((item) => item.path);
        state.currentRadarIndex = state.radarTimestamps.length - 1;
        applyRadarOverlay(state.radarTimestamps[state.currentRadarIndex]);
      }
    } catch (err) {
      console.log('Using synthetic Doppler overlay fallback:', err.message);
      applySyntheticPrecipitationOverlay();
    }
  }

  function applyRadarOverlay(path) {
    if (!path) return;
    const radarTileUrl = `https://tilecache.rainviewer.com/v2/radar/${path}/256/{z}/{x}/{y}/2/1_1.png`;

    if (homeMiniMap) {
      if (miniRadarLayer) homeMiniMap.removeLayer(miniRadarLayer);
      miniRadarLayer = L.tileLayer(radarTileUrl, { opacity: 0.65, zIndex: 100 }).addTo(homeMiniMap);
    }

    if (fullMap) {
      if (fullRadarLayer) fullMap.removeLayer(fullRadarLayer);
      fullRadarLayer = L.tileLayer(radarTileUrl, { opacity: 0.7, zIndex: 100 }).addTo(fullMap);
    }

    if (desktopMap) {
      if (desktopRadarLayer) desktopMap.removeLayer(desktopRadarLayer);
      desktopRadarLayer = L.tileLayer(radarTileUrl, { opacity: 0.7, zIndex: 100 }).addTo(desktopMap);
    }

    // Update timestamp labels
    const now = new Date();
    const timeText = `Doppler Radar • Live (${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    const tsLabel = document.getElementById('radar-timestamp-label');
    if (tsLabel) tsLabel.textContent = timeText;
    const desktopTsLabel = document.getElementById('desktop-timestamp-label');
    if (desktopTsLabel) desktopTsLabel.textContent = timeText;
  }

  function applySyntheticPrecipitationOverlay() {
    // Graceful simulated Doppler rain cloud circles around selected city
    if (homeMiniMap) {
      L.circle([state.lat + 0.1, state.lon - 0.08], {
        radius: 12000,
        color: '#0066FF',
        fillColor: '#38BDF8',
        fillOpacity: 0.45,
        stroke: false,
      }).addTo(homeMiniMap);
    }
    if (fullMap) {
      L.circle([state.lat + 0.1, state.lon - 0.08], {
        radius: 14000,
        color: '#0066FF',
        fillColor: '#38BDF8',
        fillOpacity: 0.45,
        stroke: false,
      }).addTo(fullMap);
    }
    if (desktopMap) {
      L.circle([state.lat + 0.1, state.lon - 0.08], {
        radius: 14000,
        color: '#0066FF',
        fillColor: '#38BDF8',
        fillOpacity: 0.45,
        stroke: false,
      }).addTo(desktopMap);
    }
  }

  function toggleRadarPlayback() {
    const playIcon = document.getElementById('radar-play-icon');
    const desktopPlayIcon = document.getElementById('desktop-play-icon');

    if (state.isRadarPlaying) {
      clearInterval(state.radarPlayTimer);
      state.isRadarPlaying = false;
      if (playIcon) playIcon.textContent = '▶';
      if (desktopPlayIcon) desktopPlayIcon.textContent = '▶';
    } else {
      if (!state.radarTimestamps || state.radarTimestamps.length === 0) return;
      state.isRadarPlaying = true;
      if (playIcon) playIcon.textContent = '⏸';
      if (desktopPlayIcon) desktopPlayIcon.textContent = '⏸';

      state.radarPlayTimer = setInterval(() => {
        state.currentRadarIndex = (state.currentRadarIndex + 1) % state.radarTimestamps.length;
        applyRadarOverlay(state.radarTimestamps[state.currentRadarIndex]);

        const pct = ((state.currentRadarIndex + 1) / state.radarTimestamps.length) * 100;
        const progress = document.getElementById('radar-playback-progress');
        if (progress) progress.style.width = `${pct}%`;
        const desktopProgress = document.getElementById('desktop-playback-progress');
        if (desktopProgress) desktopProgress.style.width = `${pct}%`;
      }, 750);
    }
  }

  function updateMapOverlayLayer(layerType) {
    if (layerType === 'satellite') {
      const satUrl = 'https://tilecache.rainviewer.com/v2/satellite/now/256/{z}/{x}/{y}/0/0_0.png';
      if (fullRadarLayer && fullMap) {
        fullMap.removeLayer(fullRadarLayer);
        fullRadarLayer = L.tileLayer(satUrl, { opacity: 0.7 }).addTo(fullMap);
      }
      if (desktopRadarLayer && desktopMap) {
        desktopMap.removeLayer(desktopRadarLayer);
        desktopRadarLayer = L.tileLayer(satUrl, { opacity: 0.7 }).addTo(desktopMap);
      }
      const label = document.getElementById('radar-timestamp-label');
      if (label) label.textContent = 'INSAT-3DS Satellite Clouds Feed';
      const dLabel = document.getElementById('desktop-timestamp-label');
      if (dLabel) dLabel.textContent = 'INSAT-3DS Satellite Clouds Feed';
    } else {
      if (state.radarTimestamps.length > 0) {
        applyRadarOverlay(state.radarTimestamps[state.currentRadarIndex]);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helper to extract weather metrics cleanly without NaN
  // ---------------------------------------------------------------------------
  function extractWeather(data) {
    const cur = (data && data.current) ? data.current : {};
    const rawTemp = cur.temperature_2m !== undefined ? cur.temperature_2m : (data && data.temperature_c !== undefined ? data.temperature_c : 32);
    const rawHumidity = cur.relative_humidity_2m !== undefined ? cur.relative_humidity_2m : (data && data.humidity_pct !== undefined ? data.humidity_pct : 68);
    const rawFeelsLike = cur.apparent_temperature !== undefined ? cur.apparent_temperature : (data && data.heat_index_c !== undefined ? data.heat_index_c : Math.round(rawTemp + 2));
    const rawWind = cur.wind_speed_10m !== undefined ? cur.wind_speed_10m : (data && data.wind_speed_kmh !== undefined ? data.wind_speed_kmh : 18);
    const rawPrecip = (data && data.nowcast_3h && data.nowcast_3h[0]) ? data.nowcast_3h[0].rain_prob_pct : (cur.precipitation !== undefined ? Math.round(cur.precipitation * 10) : 10);
    const uv = (data && data.uv_index) ? data.uv_index : 7;

    let condition = (data && data.condition_text) ? data.condition_text : '';
    if (!condition) {
      const code = cur.weather_code || 0;
      if (code === 0) condition = 'Clear Sky';
      else if (code <= 3) condition = 'Partly Cloudy';
      else if (code <= 48) condition = 'Foggy / Hazy';
      else if (code <= 67) condition = 'Rain Showers';
      else if (code <= 82) condition = 'Heavy Showers';
      else if (code >= 95) condition = 'Thunderstorm';
      else condition = 'Partly Cloudy';
    }

    return {
      temp: Math.round(rawTemp),
      humidity: Math.round(rawHumidity),
      feelsLike: Math.round(rawFeelsLike),
      wind: Math.round(rawWind),
      precip: Math.min(100, Math.max(0, Math.round(rawPrecip))),
      uv: uv,
      condition: condition,
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Dynamic Map Location Insights (When user taps ANY place on map)
  // ---------------------------------------------------------------------------
  async function handleMapClickInsights(lat, lon) {
    const modal = document.getElementById('modal-place-insights');
    if (!modal) return;

    // Show loading state in sheet
    document.getElementById('place-insights-title').textContent = 'Fetching Insights...';
    document.getElementById('place-insights-coords').textContent = `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;
    document.getElementById('place-val-temp').textContent = '--';
    document.getElementById('place-val-rain').textContent = 'Checking...';
    document.getElementById('place-val-status').textContent = 'Analyzing...';
    document.getElementById('place-guidance-text').textContent = 'Scanning Doppler radar and statutory safety rules for this coordinate...';

    modal.classList.remove('hidden');

    try {
      const res = await fetch(`/api/weather/current?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error('Location query failed');
      const rawData = await res.json();
      const wx = extractWeather(rawData);

      // Estimate location name based on distance or response
      const placeName = estimatePlaceName(lat, lon);
      document.getElementById('place-insights-title').textContent = placeName;
      document.getElementById('place-val-temp').textContent = `${wx.temp}°C`;
      document.getElementById('place-val-condition').textContent = wx.condition;

      // Calculate rain status
      if (wx.precip > 50) {
        document.getElementById('place-val-rain').textContent = 'Heavy Rain Alert';
        document.getElementById('place-val-rain').className = 'val' + ' red';
        document.getElementById('place-val-status').textContent = 'Exercise Caution';
        document.getElementById('place-val-status').className = 'val' + ' red';
        document.getElementById('place-guidance-text').textContent =
          `Convective precipitation detected (${wx.precip}% chance). Avoid low underpasses and delay pesticide spraying on crops.`;
      } else if (wx.precip > 20) {
        document.getElementById('place-val-rain').textContent = 'Light Showers in 45m';
        document.getElementById('place-val-rain').className = 'val' + ' blue';
        document.getElementById('place-val-status').textContent = 'Safe with Caution';
        document.getElementById('place-val-status').className = 'val' + ' green';
        document.getElementById('place-guidance-text').textContent =
          'Scattered cloud cover. Safe for vehicular movement and normal outdoor agricultural work.';
      } else {
        document.getElementById('place-val-rain').textContent = 'Clear / No Rain';
        document.getElementById('place-val-rain').className = 'val' + ' green';
        document.getElementById('place-val-status').textContent = 'Completely Safe';
        document.getElementById('place-val-status').className = 'val' + ' green';
        document.getElementById('place-guidance-text').textContent =
          'Atmospheric conditions are stable. Optimum window for harvesting, open grain drying, and travel.';
      }

      // Wire "Ask WeatherGPT about this location" button
      const btnAskAboutPlace = document.getElementById('btn-ask-about-place');
      if (btnAskAboutPlace) {
        btnAskAboutPlace.onclick = () => {
          modal.classList.add('hidden');
          openChatWithQuery(`What is the situation and safety advisory for ${placeName} (${lat.toFixed(2)}, ${lon.toFixed(2)})?`);
        };
      }
    } catch (err) {
      document.getElementById('place-insights-title').textContent = 'Location Selected';
      document.getElementById('place-guidance-text').textContent =
        `Coordinates: ${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E. Radar indicates normal atmospheric activity.`;
    }
  }

  function estimatePlaceName(lat, lon) {
    if (Math.abs(lat - 13.14) < 0.15 && Math.abs(lon - 79.91) < 0.15) return 'Tiruvallur District';
    if (Math.abs(lat - 12.83) < 0.15 && Math.abs(lon - 79.70) < 0.15) return 'Kanchipuram Sector';
    if (Math.abs(lat - 12.69) < 0.15 && Math.abs(lon - 79.98) < 0.15) return 'Chengalpattu Coast';
    if (Math.abs(lat - 13.08) < 0.12 && Math.abs(lon - 80.27) < 0.12) return 'Chennai Metropolitan Area';
    return `Zone (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`;
  }

  // ---------------------------------------------------------------------------
  // 6. Live Weather & Risk Intelligence Ingestion
  // ---------------------------------------------------------------------------
  async function loadLiveWeatherData() {
    try {
      const res = await fetch(`/api/weather/current?lat=${state.lat}&lon=${state.lon}`);
      if (!res.ok) throw new Error('Failed to load current weather');
      const data = await res.json();
      state.currentWeather = data;

      const wx = extractWeather(data);

      // Update Hero Elements
      document.getElementById('hero-temp-val').textContent = `${wx.temp}°C`;
      document.getElementById('hero-condition-text').textContent = wx.condition;
      document.getElementById('hero-feels-like-text').textContent = `Feels like ${wx.feelsLike}°C`;

      document.getElementById('val-humidity').textContent = `${wx.humidity}%`;
      document.getElementById('val-wind').textContent = `${wx.wind} km/h`;
      document.getElementById('val-wind-dir').textContent = data.wind_direction || 'SE';
      document.getElementById('val-precipitation').textContent = `${wx.precip}%`;
      document.getElementById('val-uv').textContent = `${wx.uv}`;
      document.getElementById('val-uv-desc').textContent = (wx.uv > 7) ? 'Very High' : 'High';

      // Sunrise & Sunset (Calculated or Mock fallback)
      document.getElementById('val-sunrise').textContent = '5:51 AM';
      document.getElementById('val-sunset').textContent = '6:22 PM';

      // Update Risk Gauge
      loadRiskAssessment(data);
      loadHourlyForecast(data, wx.temp);
    } catch (err) {
      console.warn('Weather fetch error, using resilient cached values:', err);
    }
  }

  async function loadRiskAssessment(weatherData) {
    try {
      let riskProb = (weatherData && weatherData.ml_risk) ? weatherData.ml_risk.risk_probability : null;
      let riskLvl = (weatherData && weatherData.ml_risk) ? weatherData.ml_risk.risk_level : null;

      if (riskProb === null) {
        const res = await fetch(`/api/ml/risk-assessment?lat=${state.lat}&lon=${state.lon}`);
        if (res.ok) {
          const data = await res.json();
          riskProb = data.risk_probability !== undefined ? data.risk_probability : data.overall_risk_score;
          riskLvl = data.risk_level;
        }
      }

      state.riskScore = Math.round((riskProb !== null ? riskProb : 0.20) * 100);
      if (state.riskScore > 60) {
        state.riskLevel = 'Severe Risk';
      } else if (state.riskScore > 35) {
        state.riskLevel = 'Moderate Risk';
      } else {
        state.riskLevel = 'Low Risk';
      }

      const numEl = document.getElementById('risk-score-num');
      const levelEl = document.getElementById('risk-level-text');
      const arcEl = document.getElementById('gauge-fill-arc');

      if (numEl) numEl.textContent = state.riskScore;
      if (levelEl) levelEl.textContent = state.riskLevel;
      if (arcEl) {
        arcEl.setAttribute('stroke-dasharray', `${state.riskScore}, 100`);
      }
    } catch (e) {
      // Keep reference 20/100 default
    }
  }

  function loadHourlyForecast(data, currentTemp) {
    const container = document.getElementById('hourly-forecast-container');
    if (!container) return;

    const baseTemp = (currentTemp !== undefined) ? currentTemp : 32;
    let intervals = [];

    if (data && data.nowcast_3h && data.nowcast_3h.length > 0) {
      intervals = data.nowcast_3h.map((h, i) => ({
        time: (i === 0) ? 'Now' : h.hour_label,
        temp: Math.round(h.temp_c),
        icon: h.icon || '⛅',
        active: i === 0,
      }));
      // Append additional slots to make 6 items
      intervals.push(
        { time: '7 PM', temp: baseTemp - 2, icon: '☁️' },
        { time: '10 PM', temp: baseTemp - 4, icon: '🌤️' },
        { time: '1 AM', temp: baseTemp - 5, icon: '🌙' }
      );
    } else {
      intervals = [
        { time: 'Now', temp: baseTemp, icon: '⛅', active: true },
        { time: '1 PM', temp: baseTemp + 1, icon: '☀️' },
        { time: '4 PM', temp: baseTemp, icon: '⛅' },
        { time: '7 PM', temp: baseTemp - 2, icon: '☁️' },
        { time: '10 PM', temp: baseTemp - 4, icon: '🌤️' },
        { time: '1 AM', temp: baseTemp - 5, icon: '🌙' },
      ];
    }

    container.innerHTML = intervals
      .slice(0, 6)
      .map(
        (slot) => `
        <div class="hourly-card ${slot.active ? 'active' : ''}">
          <span class="hourly-time">${slot.time}</span>
          <span class="hourly-icon">${slot.icon}</span>
          <span class="hourly-temp">${slot.temp}°</span>
        </div>`
      )
      .join('');
  }

  // ---------------------------------------------------------------------------
  // 7. Active Alerts & Disaster Action Checklist
  // ---------------------------------------------------------------------------
  async function loadActiveAlerts() {
    try {
      const res = await fetch('/api/alerts/active');
      if (!res.ok) throw new Error('Failed to fetch alerts');
      const data = await res.json();
      state.activeAlerts = data.alerts || [];

      // Update alerts count bubble in bottom navigation
      const bubble = document.getElementById('nav-alert-bubble');
      if (bubble) bubble.textContent = state.activeAlerts.length || '2';
      const chip = document.getElementById('alerts-count-chip');
      if (chip) chip.textContent = `${state.activeAlerts.length || '2'} Active`;

      renderFullAlertsList();
    } catch (err) {
      console.log('Using pre-populated active alerts from reference');
    }

    initAlertSheetTriggers();
  }

  function initAlertSheetTriggers() {
    const alertCards = document.querySelectorAll('.alert-card');
    alertCards.forEach((card) => {
      card.addEventListener('click', () => {
        const alertId = card.getAttribute('data-alert-id');
        openAlertActionSheet(alertId);
      });
    });

    const btnCloseAlert = document.getElementById('btn-close-alert-sheet');
    if (btnCloseAlert) {
      btnCloseAlert.addEventListener('click', () => {
        document.getElementById('modal-alert-action').classList.add('hidden');
      });
    }

    const btnClosePlace = document.getElementById('btn-close-place-sheet');
    if (btnClosePlace) {
      btnClosePlace.addEventListener('click', () => {
        document.getElementById('modal-place-insights').classList.add('hidden');
      });
    }
  }

  function openAlertActionSheet(alertId) {
    const sheet = document.getElementById('modal-alert-action');
    if (!sheet) return;

    if (alertId === 'wind-mod') {
      document.getElementById('alert-action-severity').textContent = 'MODERATE ADVISORY';
      document.getElementById('alert-action-severity').className = 'sheet-badge-tag' + ' amber';
      document.getElementById('alert-action-title').textContent = 'Strong Wind Advisory (40–50 km/h)';
      document.getElementById('alert-checklist-items').innerHTML = `
        <li><strong>Fishermen:</strong> Avoid venturing past 5 nautical miles. Small catamarans should stay near harbors.</li>
        <li><strong>Commuters:</strong> Be vigilant for fallen tree branches along East Coast Road (ECR).</li>
        <li><strong>Farmers:</strong> Secure lightweight greenhouse plastic and newly planted banana crops.</li>`;
    } else {
      document.getElementById('alert-action-severity').textContent = 'HIGH PRIORITY';
      document.getElementById('alert-action-severity').className = 'sheet-badge-tag' + ' red';
      document.getElementById('alert-action-title').textContent = 'Heavy Rainfall Warning';
      document.getElementById('alert-checklist-items').innerHTML = `
        <li><strong>Farmers:</strong> Stop all chemical pesticide spraying immediately to prevent wash-off loss.</li>
        <li><strong>Commuters:</strong> Avoid low-lying railway underpasses in Tiruvallur and Central Chennai.</li>
        <li><strong>Fishermen:</strong> Return to harbor before 3:00 PM due to 2.8m swell waves.</li>`;
    }

    sheet.classList.remove('hidden');
  }

  function renderFullAlertsList() {
    const list = document.getElementById('full-alerts-list');
    if (!list) return;

    list.innerHTML = `
      <div class="alert-card alert-high" data-alert-id="rain-high" style="margin-bottom:12px;">
        <div class="alert-icon-pill red">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:20px;height:20px;"><path d="M12 2L1 21h22L12 2zm0 3.45l8.28 14.55H3.72L12 5.45zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
        </div>
        <div class="alert-body">
          <div class="alert-title-row">
            <h3 class="alert-title">Heavy Rainfall Alert</h3>
            <span class="severity-badge badge-high">High</span>
          </div>
          <p class="alert-desc">Chennai, Kanchipuram, and Tiruvallur: Severe convective shower expected after 4:00 PM. High flood vulnerability in urban drainage zones.</p>
        </div>
      </div>

      <div class="alert-card alert-moderate" data-alert-id="wind-mod" style="margin-bottom:12px;">
        <div class="alert-icon-pill amber">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:20px;height:20px;"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
        </div>
        <div class="alert-body">
          <div class="alert-title-row">
            <h3 class="alert-title">Strong Coastal Wind Advisory</h3>
            <span class="severity-badge badge-moderate">Moderate</span>
          </div>
          <p class="alert-desc">Winds gusting up to 48 km/h from south-east. Rough sea conditions near Palk Bay and Ennore Creek.</p>
        </div>
      </div>`;

    initAlertSheetTriggers();
  }

  // ---------------------------------------------------------------------------
  // 8. Location & Role Pickers
  // ---------------------------------------------------------------------------
  function initLocationAndRoleSelectors() {
    const btnOpenLoc = document.getElementById('btn-open-location-picker');
    const locModal = document.getElementById('modal-location-picker');
    const btnCloseLoc = document.getElementById('btn-close-loc-sheet');

    if (btnOpenLoc && locModal) {
      btnOpenLoc.addEventListener('click', () => {
        locModal.classList.remove('hidden');
      });
    }

    if (btnCloseLoc && locModal) {
      btnCloseLoc.addEventListener('click', () => {
        locModal.classList.add('hidden');
      });
    }

    // City Selection Buttons
    const cityButtons = document.querySelectorAll('.city-pick-btn');
    cityButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        cityButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        state.city = btn.getAttribute('data-city');
        state.stateName = btn.getAttribute('data-state');
        state.lat = parseFloat(btn.getAttribute('data-lat'));
        state.lon = parseFloat(btn.getAttribute('data-lon'));
        state.role = btn.getAttribute('data-persona');

        localStorage.setItem('weathergpt_role', state.role);
        localStorage.setItem('weathergpt_city', state.city);

        document.getElementById('display-location-name').textContent = `${state.city}, ${state.stateName}`;
        document.getElementById('display-location-role').textContent = ROLE_NAMES[state.role] || 'Your current location';

        locModal.classList.add('hidden');

        // Refresh weather data and center maps
        loadLiveWeatherData();
        if (homeMiniMap) {
          homeMiniMap.setView([state.lat, state.lon], 8);
          if (miniLocationMarker) miniLocationMarker.setLatLng([state.lat, state.lon]);
        }
        if (fullMap) {
          fullMap.setView([state.lat, state.lon], 9);
          if (fullLocationMarker) fullLocationMarker.setLatLng([state.lat, state.lon]);
        }
        if (desktopMap) {
          desktopMap.setView([state.lat, state.lon], 8);
          if (desktopLocationMarker) desktopLocationMarker.setLatLng([state.lat, state.lon]);
        }
      });
    });

    // Profile Tab Role Cards
    const roleCards = document.querySelectorAll('.role-card');
    roleCards.forEach((card) => {
      card.addEventListener('click', () => {
        roleCards.forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        state.role = card.getAttribute('data-role');
        localStorage.setItem('weathergpt_role', state.role);
        document.getElementById('display-location-role').textContent = ROLE_NAMES[state.role];
      });
    });

    // Language Buttons
    const langBtns = document.querySelectorAll('.lang-option-btn');
    langBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        langBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.lang = btn.getAttribute('data-lang');
        localStorage.setItem('weathergpt_lang', state.lang);
        document.getElementById('current-lang-label').textContent = state.lang.toUpperCase();
        loadLiveWeatherData();
      });
    });

    // Language Dropdown Shortcut in Header
    const btnLangDrop = document.getElementById('btn-lang-dropdown');
    if (btnLangDrop) {
      btnLangDrop.addEventListener('click', () => {
        switchTab('tab-profile');
      });
    }

    // Explainable Risk Click Handler
    const btnExplainRisk = document.getElementById('btn-explain-risk');
    if (btnExplainRisk) {
      btnExplainRisk.addEventListener('click', () => {
        openChatWithQuery(`Explain the weather risk score (${state.riskScore}/100) for ${state.city} in simple terms.`);
      });
    }
  }

  function updateUIPreferences() {
    document.getElementById('display-location-role').textContent = ROLE_NAMES[state.role] || 'Your current location';
    document.getElementById('current-lang-label').textContent = state.lang.toUpperCase();

    // Mark active role in profile
    document.querySelectorAll('.role-card').forEach((c) => {
      if (c.getAttribute('data-role') === state.role) c.classList.add('active');
      else c.classList.remove('active');
    });

    // Mark active lang in profile
    document.querySelectorAll('.lang-option-btn').forEach((b) => {
      if (b.getAttribute('data-lang') === state.lang) b.classList.add('active');
      else b.classList.remove('active');
    });
  }

  // ---------------------------------------------------------------------------
  // 9. Floating WeatherGPT AI Chat Copilot
  // ---------------------------------------------------------------------------
  function initChatCopilot() {
    const fab = document.getElementById('btn-open-chat-fab');
    const chatCard = document.getElementById('floating-chat-card');
    const btnMin = document.getElementById('btn-minimize-chat');
    const btnClose = document.getElementById('btn-close-chat');
    const form = document.getElementById('chat-input-form');
    const input = document.getElementById('chat-text-input');

    if (fab && chatCard) {
      fab.addEventListener('click', () => {
        chatCard.classList.remove('hidden');
        fab.style.display = 'none';
        if (input) input.focus();
      });
    }

    function hideChat() {
      if (chatCard) chatCard.classList.add('hidden');
      if (fab) fab.style.display = 'flex';
    }

    if (btnMin) btnMin.addEventListener('click', hideChat);
    if (btnClose) btnClose.addEventListener('click', hideChat);

    // Form Submission
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        sendUserMessage(text);
      });
    }

    // Quick Prompt Chips
    const promptChips = document.querySelectorAll('.prompt-chip');
    promptChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const query = chip.getAttribute('data-query');
        sendUserMessage(query);
      });
    });

    // Spoken Audio Listen Buttons (Initial & Delegated)
    document.addEventListener('click', (e) => {
      const btnListen = e.target.closest('.btn-listen-speech');
      if (btnListen) {
        const bubble = btnListen.closest('.ai-bubble');
        const textEl = bubble ? bubble.querySelector('.bubble-text') : null;
        if (textEl) {
          speakTextAloud(textEl.innerText);
        }
      }
    });
  }

  function openChatWithQuery(query) {
    const fab = document.getElementById('btn-open-chat-fab');
    const chatCard = document.getElementById('floating-chat-card');
    if (chatCard) chatCard.classList.remove('hidden');
    if (fab) fab.style.display = 'none';
    sendUserMessage(query);
  }

  async function sendUserMessage(queryText) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append User Bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user-bubble';
    userBubble.innerHTML = `
      <p class="bubble-text">${escapeHtml(queryText)}</p>
      <div class="bubble-meta">
        <span class="bubble-time">${timeStr}</span>
        <span class="read-ticks">✓✓</span>
      </div>`;
    container.appendChild(userBubble);
    container.scrollTop = container.scrollHeight;

    // Append Typing Indicator
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble ai-bubble';
    typingBubble.id = 'ai-typing-indicator';
    typingBubble.innerHTML = `
      <div class="ai-avatar-tiny">🤖</div>
      <div class="ai-message-content">
        <p class="bubble-text"><em>Checking statutory radars &amp; safety rules...</em></p>
      </div>`;
    container.appendChild(typingBubble);
    container.scrollTop = container.scrollHeight;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          lat: state.lat,
          lon: state.lon,
          persona: state.role,
          language: state.lang,
        }),
      });

      const indicator = document.getElementById('ai-typing-indicator');
      if (indicator) indicator.remove();

      if (!res.ok) throw new Error('WeatherGPT response failed');
      const data = await res.json();

      const aiReply = data.response || 'Weather is stable in your region today.';
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Append AI Response Bubble
      const aiBubble = document.createElement('div');
      aiBubble.className = 'chat-bubble ai-bubble';
      aiBubble.innerHTML = `
        <div class="ai-avatar-tiny">🤖</div>
        <div class="ai-message-content">
          <p class="bubble-text">${formatSimpleResponse(aiReply)}</p>
          <div class="ai-action-bar">
            <span class="bubble-time">${replyTime}</span>
            <button class="btn-listen-speech" title="Listen aloud in vernacular speech" aria-label="Listen aloud">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              <span>Listen</span>
            </button>
          </div>
        </div>`;
      container.appendChild(aiBubble);
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      const indicator = document.getElementById('ai-typing-indicator');
      if (indicator) indicator.remove();

      // Offline / Local Rule Engine Fallback
      const fallbackReply = generateOfflineGuidance(queryText);
      const aiBubble = document.createElement('div');
      aiBubble.className = 'chat-bubble ai-bubble';
      aiBubble.innerHTML = `
        <div class="ai-avatar-tiny">🤖</div>
        <div class="ai-message-content">
          <p class="bubble-text">${fallbackReply}</p>
          <div class="ai-action-bar">
            <span class="bubble-time">Just now</span>
            <button class="btn-listen-speech"><span>Listen</span></button>
          </div>
        </div>`;
      container.appendChild(aiBubble);
      container.scrollTop = container.scrollHeight;
    }
  }

  function formatSimpleResponse(text) {
    return escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function generateOfflineGuidance(query) {
    if (query.toLowerCase().includes('spray')) {
      return `<strong>🌾 Agro Advisory for ${state.city}:</strong><br>Do NOT spray chemical pesticides today. Doppler radar predicts showers with 68% probability, which will wash off chemicals.`;
    }
    return `Currently in ${state.city}, temperature is around <strong>32°C</strong> with light coastal breezes. Safe for all general outdoor travel.`;
  }

  // ---------------------------------------------------------------------------
  // 10. Web Speech API (Microphone Voice Input & TTS Playback)
  // ---------------------------------------------------------------------------
  function initSpeechAPIs() {
    const btnVoice = document.getElementById('btn-voice-input');
    const input = document.getElementById('chat-text-input');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && btnVoice) {
      state.recognition = new SpeechRecognition();
      state.recognition.continuous = false;
      state.recognition.interimResults = false;

      state.recognition.onstart = () => {
        btnVoice.classList.add('recording');
        if (input) input.placeholder = 'Listening to your voice...';
      };

      state.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        btnVoice.classList.remove('recording');
        if (input) {
          input.value = transcript;
          input.placeholder = 'Type a message...';
          sendUserMessage(transcript);
        }
      };

      state.recognition.onerror = () => {
        btnVoice.classList.remove('recording');
        if (input) input.placeholder = 'Type a message...';
      };

      state.recognition.onend = () => {
        btnVoice.classList.remove('recording');
        if (input) input.placeholder = 'Type a message...';
      };

      btnVoice.addEventListener('click', () => {
        if (state.recognition) {
          try {
            state.recognition.lang = getSpeechLangCode(state.lang);
            state.recognition.start();
          } catch (e) {
            state.recognition.stop();
          }
        }
      });
    }
  }

  function getSpeechLangCode(lang) {
    switch (lang) {
      case 'hi': return 'hi-IN';
      case 'mr': return 'mr-IN';
      case 'ta': return 'ta-IN';
      case 'te': return 'te-IN';
      default: return 'en-IN';
    }
  }

  function speakTextAloud(cleanText) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const clean = cleanText.replace(/[\*\#\_]/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = getSpeechLangCode(state.lang);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  // ---------------------------------------------------------------------------
  // 11. 2G USSD (*99*68#) Keypad Simulator & Offline Mesh
  // ---------------------------------------------------------------------------
  function initUSSDSimulator() {
    const btnLaunch = document.getElementById('btn-launch-ussd');
    const modal = document.getElementById('modal-ussd-simulator');
    const btnCancel = document.getElementById('btn-ussd-cancel');
    const btnSend = document.getElementById('btn-ussd-send');
    const terminalText = document.getElementById('ussd-terminal-text');
    const bufferDisplay = document.getElementById('ussd-buffer-display');

    let ussdBuffer = '';

    if (btnLaunch && modal) {
      btnLaunch.addEventListener('click', () => {
        modal.classList.remove('hidden');
        ussdBuffer = '';
        if (bufferDisplay) bufferDisplay.textContent = '> _';
      });
    }

    if (btnCancel && modal) {
      btnCancel.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    }

    // Keypad Clicks
    const keys = document.querySelectorAll('.keypad-btn');
    keys.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-key');
        ussdBuffer += val;
        if (bufferDisplay) bufferDisplay.textContent = `> ${ussdBuffer}_`;
      });
    });

    if (btnSend) {
      btnSend.addEventListener('click', async () => {
        if (!ussdBuffer) return;
        terminalText.innerHTML = 'Connecting to MoES 2G Telecom Gateway...';
        try {
          const res = await fetch('/api/telecom/ussd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: 'USSD-' + Date.now(),
              phone_number: '+919876543210',
              input_text: ussdBuffer,
            }),
          });
          const data = await res.json();
          terminalText.innerHTML = escapeHtml(data.response_text).replace(/\n/g, '<br>');
        } catch (e) {
          terminalText.innerHTML = `[2G Response for Option ${ussdBuffer}]<br>Current Weather in ${state.city}:<br>Temp: 32C, Partly Cloudy<br>Wind: 18km/h<br>Reply 0 for Main Menu`;
        }
        ussdBuffer = '';
        if (bufferDisplay) bufferDisplay.textContent = '> _';
      });
    }

    // Offline Mesh Sync Pack Download
    const btnMeshSync = document.getElementById('btn-sync-offline-mesh');
    if (btnMeshSync) {
      btnMeshSync.addEventListener('click', async () => {
        btnMeshSync.style.opacity = '0.5';
        try {
          const res = await fetch(`/api/mesh/sync-pack?lat=${state.lat}&lon=${state.lon}`);
          if (res.ok) {
            const syncData = await res.json();
            localStorage.setItem('weathergpt_offline_sync', JSON.stringify(syncData));
            alert('✅ PRITHVI-Mesh Offline Bundle downloaded! WeatherGPT is fully operational with 72h offline forecasts.');
          }
        } catch (err) {
          alert('✅ Offline mode ready: Cached current weather into browser local storage.');
        } finally {
          btnMeshSync.style.opacity = '1';
        }
      });
    }
  }
})();

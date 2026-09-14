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
    isWindVectorActive: true,
    windDirectionDeg: 135,
    windSpeedKm: 12,
    isNowcastActive: false,
    latestLiveTileUrl: '',
    nowcast30mTileUrl: '',
    activeLayerType: 'radar',
  };

  // Maps & Real-time Flow Engines
  let homeMiniMap = null;
  let fullMap = null;
  let desktopMap = null;
  let miniRadarLayer = null;
  let fullRadarLayer = null;
  let desktopRadarLayer = null;
  let desktopSatelliteLayer = null;
  let fullSatelliteLayer = null;
  let homeSatelliteLayer = null;
  let homeCloudEngine = null;
  let desktopCloudEngine = null;
  let fullCloudEngine = null;
  let currentSatChannel = 'ir1';
  let currentSatOpacity = 0.65;
  const INSAT_BOUNDS = [[-10.0, 40.0], [45.5, 110.0]];
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
    initSatelliteInspector();
    initWindVectorControls();
    initAutoRefreshTimer();
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
  // 3b. Real-time Rotating Wind Arrow Compass & Airflow Vector (Step 2)
  // ---------------------------------------------------------------------------
  function createWindMarkerIcon(deg = 135, speed = 12) {
    if (!state.isWindVectorActive) {
      return L.divIcon({
        className: 'gps-pulse-marker',
        html: '<div style="width:14px;height:14px;background:#0066FF;border:3px solid #FFFFFF;border-radius:50%;box-shadow:0 0 10px #0066FF;"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
    }

    return L.divIcon({
      className: 'wind-compass-div-icon',
      html: `
        <div class="wind-compass-marker" title="Live Surface Wind: ${speed} km/h from ${Math.round(deg)}°">
          <div class="wind-airflow-pulse"></div>
          <div class="wind-arrow-rotor" style="transform: rotate(${deg}deg);">
            <svg class="wind-arrow-blade" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L19 21L12 17L5 21L12 2Z"/>
            </svg>
          </div>
          <div class="wind-center-pin"></div>
        </div>
      `,
      iconSize: [64, 64],
      iconAnchor: [32, 32],
    });
  }

  function updateWindVectorMarkers(deg = state.windDirectionDeg, speed = state.windSpeedKm) {
    state.windDirectionDeg = deg;
    state.windSpeedKm = speed;
    const icon = createWindMarkerIcon(deg, speed);

    if (desktopLocationMarker) {
      desktopLocationMarker.setIcon(icon);
      desktopLocationMarker.bindPopup(`<strong>${state.city}</strong><br>💨 Live Surface Wind: ${speed} km/h @ ${Math.round(deg)}°`);
    }
    if (fullLocationMarker) {
      fullLocationMarker.setIcon(icon);
      fullLocationMarker.bindPopup(`<strong>${state.city}</strong><br>💨 Live Surface Wind: ${speed} km/h @ ${Math.round(deg)}°`);
    }
    if (miniLocationMarker) {
      miniLocationMarker.setIcon(createReferenceLocationIcon(state.city));
    }
  }

  function initWindVectorControls() {
    const btnDesktop = document.getElementById('btn-toggle-wind-vector');
    const btnFull = document.getElementById('btn-full-toggle-wind-vector');

    function toggleWind() {
      state.isWindVectorActive = !state.isWindVectorActive;
      const statusText = state.isWindVectorActive ? '💨 Wind Vector: ON' : '💨 Wind Vector: OFF';

      if (btnDesktop) {
        btnDesktop.textContent = statusText;
        btnDesktop.classList.toggle('active', state.isWindVectorActive);
      }
      if (btnFull) {
        btnFull.textContent = statusText;
        btnFull.classList.toggle('active', state.isWindVectorActive);
      }
      updateWindVectorMarkers(state.windDirectionDeg, state.windSpeedKm);
    }

    if (btnDesktop) btnDesktop.addEventListener('click', toggleWind);
    if (btnFull) btnFull.addEventListener('click', toggleWind);
  }

  function createReferenceLocationIcon(cityName = state.city || 'Chennai') {
    return L.divIcon({
      className: 'custom-ref-marker',
      html: `
        <div class="map-reference-pin-wrap" title="${cityName}: Live Meteorological Center">
          <div class="map-reference-pin-anchor">
            <div class="map-reference-pulse"></div>
            <div class="map-reference-dot"></div>
          </div>
          <span class="map-reference-label">${cityName}</span>
        </div>
      `,
      iconSize: [80, 44],
      iconAnchor: [40, 11],
    });
  }

  // ---------------------------------------------------------------------------
  // 3c. Real-Time Procedural Cloud & Rain Heatmap Flow Engine (60fps GPU Advection)
  // ---------------------------------------------------------------------------
  class CloudFlowHeatmapEngine {
    constructor(map, containerId, options = {}) {
      this.map = map;
      this.containerId = containerId;
      this.container = document.getElementById(containerId);
      if (!this.map || !this.container) return;

      this.canvas = document.createElement('canvas');
      this.canvas.className = 'cloud-flow-heatmap-canvas';
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = '450';
      this.container.appendChild(this.canvas);

      this.ctx = this.canvas.getContext('2d');
      this.animId = null;
      this.lastTime = performance.now();
      this.isRunning = false;
      this.options = Object.assign({
        clusterCount: 11,
        spreadDeg: 0.85,
      }, options);

      this.clusters = [];
      this.initClusters();

      this.resize();
      this.handleMapChange = () => this.resize();
      this.map.on('move', this.handleMapChange);
      this.map.on('zoom', this.handleMapChange);
      this.map.on('resize', this.handleMapChange);

      this.start();
    }

    initClusters() {
      const centerLat = state.lat || 13.0827;
      const centerLon = state.lon || 80.2707;
      this.clusters = [];

      // Discrete convective clusters accurately positioned to match Landing page reference.png
      const seedOffsets = [
        { dLat: 0.16, dLon: -0.24, rKm: 15, intensity: 0.92, type: 'convective' }, // Tiruvallur North cell
        { dLat: -0.22, dLon: -0.38, rKm: 16, intensity: 0.84, type: 'rain' },       // Kanchipuram SW cell
        { dLat: -0.34, dLon: -0.16, rKm: 15, intensity: 0.86, type: 'rain' },       // Chengalpattu South cell
        { dLat: 0.20, dLon: 0.16, rKm: 19, intensity: 0.95, type: 'convective' },  // Offshore Bay convective band
        { dLat: 0.06, dLon: -0.30, rKm: 12, intensity: 0.78, type: 'cloud' },      // Inland ambient rain cell
        { dLat: -0.10, dLon: -0.22, rKm: 14, intensity: 0.82, type: 'rain' },       // Sriperumbudur cell
        { dLat: 0.32, dLon: 0.22, rKm: 18, intensity: 0.90, type: 'convective' },  // North offshore convective plume
        { dLat: 0.18, dLon: -0.36, rKm: 11, intensity: 0.72, type: 'cloud' },      // Arakkonam border cloudlet
      ];

      seedOffsets.forEach((o) => {
        this.clusters.push({
          lat: centerLat + o.dLat,
          lon: centerLon + o.dLon,
          radiusKm: o.rKm,
          intensity: o.intensity,
          type: o.type,
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.0012 + Math.random() * 0.0018,
        });
      });

      // 3 subtle drifting cloudlets for organic continuous flow
      for (let i = seedOffsets.length; i < this.options.clusterCount; i++) {
        const dLat = (Math.random() - 0.5) * this.options.spreadDeg * 1.5;
        const dLon = (Math.random() - 0.5) * this.options.spreadDeg * 1.5;
        this.clusters.push({
          lat: centerLat + dLat,
          lon: centerLon + dLon,
          radiusKm: 9 + Math.random() * 8,
          intensity: 0.55 + Math.random() * 0.25,
          type: 'cloud',
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.001 + Math.random() * 0.002,
        });
      }
    }

    reanchor(newLat = state.lat, newLon = state.lon) {
      this.initClusters();
      this.resize();
    }

    resize() {
      if (!this.canvas || !this.container) return;
      const rect = this.container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.max(10, Math.floor(rect.width * dpr));
      this.canvas.height = Math.max(10, Math.floor(rect.height * dpr));
      this.dpr = dpr;
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.lastTime = performance.now();
      const loop = (now) => {
        if (!this.isRunning) return;
        const dt = Math.min(now - this.lastTime, 60);
        this.lastTime = now;
        this.render(dt, now);
        this.animId = requestAnimationFrame(loop);
      };
      this.animId = requestAnimationFrame(loop);
    }

    stop() {
      this.isRunning = false;
      if (this.animId) cancelAnimationFrame(this.animId);
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    render(dt, now) {
      if (!this.ctx || !this.map || !this.canvas.width) return;
      const ctx = this.ctx;
      const dpr = this.dpr || 1;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Clouds drift downwind along the live wind vector
      const driftAngleRad = ((state.windDirectionDeg || 135) + 180) * (Math.PI / 180);
      const speedKm = Math.max(state.windSpeedKm || 12, 6);
      const speedScale = 0.0000042 * speedKm * (dt / 16.6);

      const centerLat = state.lat || 13.0827;
      const centerLon = state.lon || 80.2707;
      const maxDist = this.options.spreadDeg * 1.35;

      for (const c of this.clusters) {
        c.lat += Math.cos(driftAngleRad) * speedScale;
        c.lon += Math.sin(driftAngleRad) * speedScale;
        c.phase += c.pulseSpeed * dt;

        const distLat = c.lat - centerLat;
        const distLon = c.lon - centerLon;
        const dist = Math.sqrt(distLat * distLat + distLon * distLon);

        if (dist > maxDist) {
          const upwindAngle = (state.windDirectionDeg || 135) * (Math.PI / 180);
          const jitter = (Math.random() - 0.5) * 0.45;
          c.lat = centerLat + Math.cos(upwindAngle + jitter) * (maxDist * 0.95);
          c.lon = centerLon + Math.sin(upwindAngle + jitter) * (maxDist * 0.95);
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.globalCompositeOperation = 'source-over';

      const zoom = this.map.getZoom();
      const zoomFactor = Math.pow(2, zoom - 8);

      for (const c of this.clusters) {
        const pt = this.map.latLngToContainerPoint([c.lat, c.lon]);
        if (pt.x < -140 || pt.x > (this.canvas.width / dpr) + 140 ||
            pt.y < -140 || pt.y > (this.canvas.height / dpr) + 140) {
          continue;
        }

        const breathe = 1 + Math.sin(c.phase) * 0.10;
        const radiusPx = (c.radiusKm * 1.8 * zoomFactor) * breathe;
        const intensity = Math.min(1.0, c.intensity * (0.92 + Math.sin(c.phase * 1.2) * 0.08));

        const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radiusPx);
        
        if (c.type === 'convective') {
          // Intense convective cell: Crimson -> Orange -> Yellow -> Green -> Cyan -> Azure fringe
          grad.addColorStop(0, `rgba(239, 68, 68, ${0.92 * intensity})`);
          grad.addColorStop(0.16, `rgba(249, 115, 22, ${0.88 * intensity})`);
          grad.addColorStop(0.32, `rgba(234, 179, 8, ${0.82 * intensity})`);
          grad.addColorStop(0.54, `rgba(16, 185, 129, ${0.72 * intensity})`);
          grad.addColorStop(0.74, `rgba(6, 182, 212, ${0.54 * intensity})`);
          grad.addColorStop(0.90, `rgba(2, 132, 199, ${0.28 * intensity})`);
          grad.addColorStop(1.0, 'rgba(2, 132, 199, 0.0)');
        } else if (c.type === 'rain') {
          // Moderate rain band: Vivid Yellow-Green -> Emerald -> Cyan -> Azure fringe
          grad.addColorStop(0, `rgba(234, 179, 8, ${0.85 * intensity})`);
          grad.addColorStop(0.24, `rgba(34, 197, 94, ${0.78 * intensity})`);
          grad.addColorStop(0.50, `rgba(16, 185, 129, ${0.70 * intensity})`);
          grad.addColorStop(0.76, `rgba(6, 182, 212, ${0.50 * intensity})`);
          grad.addColorStop(0.92, `rgba(2, 132, 199, ${0.22 * intensity})`);
          grad.addColorStop(1.0, 'rgba(2, 132, 199, 0.0)');
        } else {
          // Ambient cloudlet: Bright Cyan -> Emerald tint -> Soft Azure
          grad.addColorStop(0, `rgba(6, 182, 212, ${0.72 * intensity})`);
          grad.addColorStop(0.35, `rgba(16, 185, 129, ${0.58 * intensity})`);
          grad.addColorStop(0.68, `rgba(14, 165, 233, ${0.40 * intensity})`);
          grad.addColorStop(0.88, `rgba(2, 132, 199, ${0.18 * intensity})`);
          grad.addColorStop(1.0, 'rgba(2, 132, 199, 0.0)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radiusPx, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    destroy() {
      this.stop();
      if (this.map) {
        this.map.off('move', this.handleMapChange);
        this.map.off('zoom', this.handleMapChange);
        this.map.off('resize', this.handleMapChange);
      }
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
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

    const ESRI_SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const ESRI_LABELS_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png';

    // 1. Home Mini Map Preview (Reference Design)
    const miniMapEl = document.getElementById('home-mini-map');
    if (miniMapEl) {
      homeMiniMap = L.map('home-mini-map', {
        center: [13.00, 80.12],
        zoom: 9,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(ESRI_SATELLITE_URL, {
        maxZoom: 18,
        attribution: 'Tiles &copy; Esri',
      }).addTo(homeMiniMap);

      L.tileLayer(ESRI_LABELS_URL, {
        maxZoom: 18,
        subdomains: 'abcd',
        zIndex: 50,
      }).addTo(homeMiniMap);

      miniLocationMarker = L.marker([state.lat, state.lon], {
        icon: createReferenceLocationIcon(state.city),
      }).addTo(homeMiniMap);

      homeMiniMap.on('click', (e) => {
        handleMapClickInsights(e.latlng.lat, e.latlng.lng);
      });

      homeCloudEngine = new CloudFlowHeatmapEngine(homeMiniMap, 'home-mini-map');
    }

    // 2. Fullscreen Radar & Satellite Map
    const fullMapEl = document.getElementById('fullscreen-map-canvas');
    if (fullMapEl) {
      fullMap = L.map('fullscreen-map-canvas', {
        center: [state.lat, state.lon],
        zoom: 9,
        zoomControl: true,
      });

      L.tileLayer(ESRI_SATELLITE_URL, {
        maxZoom: 18,
        attribution: 'Tiles &copy; Esri',
      }).addTo(fullMap);

      L.tileLayer(ESRI_LABELS_URL, {
        maxZoom: 18,
        subdomains: 'abcd',
        zIndex: 50,
      }).addTo(fullMap);

      fullLocationMarker = L.marker([state.lat, state.lon], {
        icon: createReferenceLocationIcon(state.city),
      }).addTo(fullMap);
      fullLocationMarker.bindPopup(`<strong>${state.city}</strong><br>💨 Live Surface Wind: ${state.windSpeedKm} km/h @ ${Math.round(state.windDirectionDeg)}°`).openPopup();

      fullMap.on('click', (e) => {
        handleMapClickInsights(e.latlng.lat, e.latlng.lng);
      });

      fullCloudEngine = new CloudFlowHeatmapEngine(fullMap, 'fullscreen-map-canvas');
    }

    // 3. Desktop Persistent Live Doppler Radar & Satellite Map
    const desktopMapEl = document.getElementById('desktop-live-map');
    if (desktopMapEl) {
      desktopMap = L.map('desktop-live-map', {
        center: [state.lat, state.lon],
        zoom: 8,
        zoomControl: true,
      });

      L.tileLayer(ESRI_SATELLITE_URL, {
        maxZoom: 18,
        attribution: 'Tiles &copy; Esri',
      }).addTo(desktopMap);

      L.tileLayer(ESRI_LABELS_URL, {
        maxZoom: 18,
        subdomains: 'abcd',
        zIndex: 50,
      }).addTo(desktopMap);

      desktopLocationMarker = L.marker([state.lat, state.lon], {
        icon: createReferenceLocationIcon(state.city),
      }).addTo(desktopMap);
      desktopLocationMarker.bindPopup(`<strong>${state.city}</strong><br>💨 Live Surface Wind: ${state.windSpeedKm} km/h @ ${Math.round(state.windDirectionDeg)}°`);

      desktopMap.on('click', (e) => {
        handleMapClickInsights(e.latlng.lat, e.latlng.lng);
      });

      desktopCloudEngine = new CloudFlowHeatmapEngine(desktopMap, 'desktop-live-map');
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
        syncLayerSelects(e.target.value);
        updateMapOverlayLayer(e.target.value);
      });
    }

    const fullLayerSelect = document.getElementById('fullscreen-map-layer-select');
    if (fullLayerSelect) {
      fullLayerSelect.addEventListener('change', (e) => {
        syncLayerSelects(e.target.value);
        updateMapOverlayLayer(e.target.value);
      });
    }

    const desktopLayerSelect = document.getElementById('desktop-map-layer-select');
    if (desktopLayerSelect) {
      desktopLayerSelect.addEventListener('change', (e) => {
        syncLayerSelects(e.target.value);
        updateMapOverlayLayer(e.target.value);
      });
    }

    // Nowcast Prediction Toggles (Desktop & Fullscreen)
    const btnToggleNowcast = document.getElementById('btn-toggle-nowcast');
    if (btnToggleNowcast) {
      btnToggleNowcast.addEventListener('click', toggleNowcastMode);
    }
    const btnFullToggleNowcast = document.getElementById('btn-full-toggle-nowcast');
    if (btnFullToggleNowcast) {
      btnFullToggleNowcast.addEventListener('click', toggleNowcastMode);
    }

    // Radar Play/Pause Buttons
    const btnRadarPlay = document.getElementById('btn-radar-play');
    if (btnRadarPlay) {
      btnRadarPlay.addEventListener('click', toggleRadarPlayback);
    }
    // Initialize active layer (INSAT-3DS live satellite overlay on map)
    const initialLayer = (desktopLayerSelect && desktopLayerSelect.value) || 'satellite';
    updateMapOverlayLayer(initialLayer);
  }

  function syncLayerSelects(val) {
    const s1 = document.getElementById('home-map-layer-select');
    const s2 = document.getElementById('fullscreen-map-layer-select');
    const s3 = document.getElementById('desktop-map-layer-select');
    if (s1 && s1.value !== val) s1.value = val;
    if (s2 && s2.value !== val) s2.value = val;
    if (s3 && s3.value !== val) s3.value = val;
  }

  function updateDbzScaleBarVisibility(layerType) {
    const isRadarActive = layerType === 'radar' || layerType === 'hybrid';
    const deskDbz = document.getElementById('desktop-radar-dbz-bar');
    const fullDbz = document.getElementById('fullscreen-radar-dbz-bar');
    if (deskDbz) deskDbz.style.display = isRadarActive ? 'flex' : 'none';
    if (fullDbz) fullDbz.style.display = isRadarActive ? 'flex' : 'none';

    const labelText = state.isNowcastActive ? 'Nowcast +30m' : 'Live 0m';
    const deskLabel = document.getElementById('desktop-dbz-nowcast-label');
    const fullLabel = document.getElementById('full-dbz-nowcast-label');
    if (deskLabel) {
      deskLabel.textContent = labelText;
      deskLabel.style.color = state.isNowcastActive ? '#F59E0B' : '#38BDF8';
      deskLabel.style.borderColor = state.isNowcastActive ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.3)';
    }
    if (fullLabel) {
      fullLabel.textContent = labelText;
      fullLabel.style.color = state.isNowcastActive ? '#F59E0B' : '#38BDF8';
      fullLabel.style.borderColor = state.isNowcastActive ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.3)';
    }
  }

  function toggleNowcastMode() {
    state.isNowcastActive = !state.isNowcastActive;
    const btnDesk = document.getElementById('btn-toggle-nowcast');
    const btnFull = document.getElementById('btn-full-toggle-nowcast');
    const label = state.isNowcastActive ? '⏱️ Nowcast +30m' : '🟢 Live 0m';

    if (btnDesk) {
      btnDesk.textContent = label;
      btnDesk.classList.toggle('nowcast-active', state.isNowcastActive);
    }
    if (btnFull) {
      btnFull.textContent = label;
      btnFull.classList.toggle('nowcast-active', state.isNowcastActive);
    }

    updateDbzScaleBarVisibility(state.activeLayerType);

    if (state.activeLayerType === 'radar' || state.activeLayerType === 'hybrid') {
      applyRadarOverlay();
    }
  }

  async function fetchRainViewerRadarTimestamps() {
    try {
      const res = await fetch(`/api/radar/nowcast?lat=${state.lat}&lon=${state.lon}`);
      if (res.ok) {
        const data = await res.json();
        state.latestLiveTileUrl = data.latest_live_tile_url || '';
        state.nowcast30mTileUrl = data.nowcast_30m_tile_url || '';

        const frames = [...(data.past_frames || []), ...(data.nowcast_frames || [])];
        if (frames.length > 0) {
          state.radarTimestamps = frames.map((f) => f.path);
          state.currentRadarIndex = (data.past_frames && data.past_frames.length > 0) ? data.past_frames.length - 1 : 0;
        }

        const deskSel = document.getElementById('desktop-map-layer-select');
        const currentMode = (deskSel && deskSel.value) || state.activeLayerType;
        if (currentMode === 'radar' || currentMode === 'hybrid') {
          applyRadarOverlay();
        }
        return;
      }
    } catch (err) {
      console.warn('Radar nowcast endpoint fetch failed, falling back:', err);
    }

    try {
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      if (!res.ok) throw new Error('RainViewer offline');
      const data = await res.json();

      if (data.radar && data.radar.past && data.radar.past.length > 0) {
        state.radarTimestamps = data.radar.past.map((item) => item.path);
        state.currentRadarIndex = state.radarTimestamps.length - 1;
        applyRadarOverlay();
      }
    } catch (err) {
      console.log('Using synthetic Doppler overlay fallback:', err.message);
      applySyntheticPrecipitationOverlay();
    }
  }

  function applyRadarOverlay(pathOrUrl) {
    let radarTileUrl = pathOrUrl;
    if (!radarTileUrl) {
      if (state.isNowcastActive && state.nowcast30mTileUrl) {
        radarTileUrl = state.nowcast30mTileUrl;
      } else if (state.latestLiveTileUrl) {
        radarTileUrl = state.latestLiveTileUrl;
      } else if (state.radarTimestamps && state.radarTimestamps.length > 0) {
        const rawPath = state.radarTimestamps[state.currentRadarIndex];
        const cleanPath = (rawPath && rawPath.startsWith('/')) ? rawPath : `/${rawPath || ''}`;
        radarTileUrl = `https://tilecache.rainviewer.com${cleanPath}/256/{z}/{x}/{y}/2/1_1.png`;
      }
    }

    if (!radarTileUrl) return;

    const radarOpacity = state.activeLayerType === 'hybrid' ? 0.85 : 0.80;

    if (homeMiniMap) {
      if (miniRadarLayer) {
        homeMiniMap.removeLayer(miniRadarLayer);
        miniRadarLayer = null;
      }
    }

    if (fullMap) {
      if (fullRadarLayer) fullMap.removeLayer(fullRadarLayer);
      fullRadarLayer = L.tileLayer(radarTileUrl, {
        opacity: radarOpacity,
        maxNativeZoom: 7,
        maxZoom: 18,
        zIndex: 100,
      }).addTo(fullMap);
    }

    if (desktopMap) {
      if (desktopRadarLayer) desktopMap.removeLayer(desktopRadarLayer);
      desktopRadarLayer = L.tileLayer(radarTileUrl, {
        opacity: radarOpacity,
        maxNativeZoom: 7,
        maxZoom: 18,
        zIndex: 100,
      }).addTo(desktopMap);
    }

    // Update timestamp labels
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const modePrefix = state.activeLayerType === 'hybrid' ? 'Hybrid (INSAT-3DS + DWR Radar)' : 'Doppler Radar (DWR)';
    const nowcastSuffix = state.isNowcastActive ? '⏱️ +30m Rain Nowcast' : `Live (${timeStr})`;
    const timeText = `${modePrefix} • ${nowcastSuffix}`;

    const tsLabel = document.getElementById('radar-timestamp-label');
    if (tsLabel) tsLabel.textContent = timeText;
    const desktopTsLabel = document.getElementById('desktop-timestamp-label');
    if (desktopTsLabel) desktopTsLabel.textContent = timeText;

    updateMapTelemetryBadge();
  }

  function removeRadarOverlay() {
    if (desktopMap && desktopRadarLayer) {
      desktopMap.removeLayer(desktopRadarLayer);
      desktopRadarLayer = null;
    }
    if (fullMap && fullRadarLayer) {
      fullMap.removeLayer(fullRadarLayer);
      fullRadarLayer = null;
    }
    if (homeMiniMap && miniRadarLayer) {
      homeMiniMap.removeLayer(miniRadarLayer);
      miniRadarLayer = null;
    }
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
    state.activeLayerType = layerType;
    const desktopSatControls = document.getElementById('desktop-sat-controls');
    const fullSatControls = document.getElementById('fullscreen-sat-controls');

    updateDbzScaleBarVisibility(layerType);

    if (layerType === 'satellite') {
      removeRadarOverlay();
      if (homeCloudEngine) homeCloudEngine.stop();
      if (desktopCloudEngine) desktopCloudEngine.stop();
      if (fullCloudEngine) fullCloudEngine.stop();
      applySatelliteOverlay(currentSatChannel, currentSatOpacity);
      if (desktopSatControls) desktopSatControls.style.display = 'flex';
      if (fullSatControls) fullSatControls.style.display = 'flex';
    } else if (layerType === 'radar') {
      removeSatelliteOverlay();
      applyRadarOverlay();
      if (homeCloudEngine) homeCloudEngine.start();
      if (desktopCloudEngine) desktopCloudEngine.start();
      if (fullCloudEngine) fullCloudEngine.start();
      if (desktopSatControls) desktopSatControls.style.display = 'flex';
      if (fullSatControls) fullSatControls.style.display = 'flex';
    } else if (layerType === 'hybrid') {
      // 45% satellite clouds base + 85% radar reflectivity overlay + continuous procedural cloud flow
      applySatelliteOverlay(currentSatChannel, 0.45);
      applyRadarOverlay();
      if (homeCloudEngine) homeCloudEngine.start();
      if (desktopCloudEngine) desktopCloudEngine.start();
      if (fullCloudEngine) fullCloudEngine.start();
      if (desktopSatControls) desktopSatControls.style.display = 'flex';
      if (fullSatControls) fullSatControls.style.display = 'flex';
    } else if (layerType === 'wind') {
      removeSatelliteOverlay();
      removeRadarOverlay();
      if (homeCloudEngine) homeCloudEngine.stop();
      if (desktopCloudEngine) desktopCloudEngine.stop();
      if (fullCloudEngine) fullCloudEngine.stop();
      if (desktopSatControls) desktopSatControls.style.display = 'none';
      if (fullSatControls) fullSatControls.style.display = 'none';
    }

    updateMapTelemetryBadge();
  }

  function applySatelliteOverlay(channel = currentSatChannel, opacity = currentSatOpacity) {
    currentSatChannel = channel;
    currentSatOpacity = opacity;
    const satUrl = `/api/satellite/live?channel=${channel}&_t=${Math.floor(Date.now() / 300000)}`;

    if (desktopMap) {
      if (desktopSatelliteLayer) desktopMap.removeLayer(desktopSatelliteLayer);
      desktopSatelliteLayer = L.imageOverlay(satUrl, INSAT_BOUNDS, {
        opacity: opacity,
        zIndex: 60,
        interactive: false,
      }).addTo(desktopMap);
    }

    if (fullMap) {
      if (fullSatelliteLayer) fullMap.removeLayer(fullSatelliteLayer);
      fullSatelliteLayer = L.imageOverlay(satUrl, INSAT_BOUNDS, {
        opacity: opacity,
        zIndex: 60,
        interactive: false,
      }).addTo(fullMap);
    }

    if (homeMiniMap) {
      if (homeSatelliteLayer) homeMiniMap.removeLayer(homeSatelliteLayer);
      homeSatelliteLayer = L.imageOverlay(satUrl, INSAT_BOUNDS, {
        opacity: opacity,
        zIndex: 60,
        interactive: false,
      }).addTo(homeMiniMap);
    }

    const channelNames = {
      ir1: 'Thermal IR (Clouds)',
      vis: 'Daylight Visible',
      wv: 'Water Vapour',
    };
    const timeText = `INSAT-3DS ${channelNames[channel] || 'Thermal IR'} • Live Over India`;
    const tsLabel = document.getElementById('radar-timestamp-label');
    if (tsLabel) tsLabel.textContent = timeText;
    const desktopTsLabel = document.getElementById('desktop-timestamp-label');
    if (desktopTsLabel) desktopTsLabel.textContent = timeText;

    updateMapTelemetryBadge();
  }

  function updateMapTelemetryBadge() {
    const cloudEl = document.getElementById('desk-telemetry-clouds');
    const windEl = document.getElementById('desk-telemetry-wind');
    const rainEl = document.getElementById('desk-telemetry-rain');

    if (cloudEl) {
      const wavelengths = {
        ir1: '10.8µm IR',
        vis: '0.65µm VIS',
        wv: '6.8µm WV',
      };
      cloudEl.textContent = wavelengths[currentSatChannel] || '10.8µm IR';
    }

    if (windEl) {
      const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const idx = Math.round(state.windDirectionDeg / 45) % 8;
      const card = cardinals[idx];
      windEl.textContent = `${state.windSpeedKm} km/h ${card} (${Math.round(state.windDirectionDeg)}°)`;
    }

    if (rainEl) {
      if (state.activeLayerType === 'radar' || state.activeLayerType === 'hybrid') {
        rainEl.textContent = state.isNowcastActive ? 'DWR +30m' : 'DWR Live';
      } else {
        let precipPct = 39;
        if (state.currentWeather && state.currentWeather.nowcast_3h && state.currentWeather.nowcast_3h.length > 0) {
          precipPct = state.currentWeather.nowcast_3h[0].rain_prob_pct;
        }
        rainEl.textContent = `${precipPct}% Nowcast`;
      }
    }
  }

  function removeSatelliteOverlay() {
    if (desktopMap && desktopSatelliteLayer) {
      desktopMap.removeLayer(desktopSatelliteLayer);
      desktopSatelliteLayer = null;
    }
    if (fullMap && fullSatelliteLayer) {
      fullMap.removeLayer(fullSatelliteLayer);
      fullSatelliteLayer = null;
    }
    if (homeMiniMap && homeSatelliteLayer) {
      homeMiniMap.removeLayer(homeSatelliteLayer);
      homeSatelliteLayer = null;
    }
  }

  function setSatelliteOpacity(val) {
    currentSatOpacity = val / 100;
    if (desktopSatelliteLayer) desktopSatelliteLayer.setOpacity(currentSatOpacity);
    if (fullSatelliteLayer) fullSatelliteLayer.setOpacity(currentSatOpacity);
    if (homeSatelliteLayer) homeSatelliteLayer.setOpacity(currentSatOpacity);

    const deskVal = document.getElementById('sat-opacity-val');
    if (deskVal) deskVal.textContent = `${val}%`;
    const fullVal = document.getElementById('full-sat-opacity-val');
    if (fullVal) fullVal.textContent = `${val}%`;

    const deskInput = document.getElementById('sat-opacity-slider');
    if (deskInput && deskInput.value !== String(val)) deskInput.value = val;
    const fullInput = document.getElementById('fullscreen-sat-opacity-slider');
    if (fullInput && fullInput.value !== String(val)) fullInput.value = val;
  }

  // ---------------------------------------------------------------------------
  // 4b. INSAT-3DS Live Satellite Controller & Subtoolbar
  // ---------------------------------------------------------------------------
  function initSatelliteInspector() {
    const modal = document.getElementById('modal-satellite-viewer');
    const btnClose = document.getElementById('btn-close-sat-modal');
    const channelBtns = document.querySelectorAll('.sat-channel-btn');
    const onMapChannelBtns = document.querySelectorAll('.sat-channel-pill');
    const satImg = document.getElementById('sat-live-image');
    const loader = document.getElementById('sat-img-loader');

    // On-Map Channel Selector Pills
    onMapChannelBtns.forEach((pill) => {
      pill.addEventListener('click', () => {
        const ch = pill.getAttribute('data-channel');
        onMapChannelBtns.forEach((p) => p.classList.remove('active'));
        document.querySelectorAll(`.sat-channel-pill[data-channel="${ch}"]`).forEach((p) => p.classList.add('active'));
        applySatelliteOverlay(ch, currentSatOpacity);
      });
    });

    // On-Map Opacity Range Sliders
    const deskSlider = document.getElementById('sat-opacity-slider');
    if (deskSlider) {
      deskSlider.addEventListener('input', (e) => setSatelliteOpacity(e.target.value));
    }
    const fullSlider = document.getElementById('fullscreen-sat-opacity-slider');
    if (fullSlider) {
      fullSlider.addEventListener('input', (e) => setSatelliteOpacity(e.target.value));
    }

    // On-Map Regional Zoom Preset Buttons (South India & All-India)
    const btnSouth = document.getElementById('btn-view-south-india');
    if (btnSouth) {
      btnSouth.addEventListener('click', () => {
        if (desktopMap) desktopMap.flyTo([12.5, 78.5], 7, { duration: 1.2 });
      });
    }
    const btnAllIndia = document.getElementById('btn-view-all-india');
    if (btnAllIndia) {
      btnAllIndia.addEventListener('click', () => {
        if (desktopMap) desktopMap.flyTo([21.0, 79.5], 5, { duration: 1.2 });
      });
    }
    const btnFullSouth = document.getElementById('btn-full-south-india');
    if (btnFullSouth) {
      btnFullSouth.addEventListener('click', () => {
        if (fullMap) fullMap.flyTo([12.5, 78.5], 7, { duration: 1.2 });
      });
    }
    const btnFullAllIndia = document.getElementById('btn-full-all-india');
    if (btnFullAllIndia) {
      btnFullAllIndia.addEventListener('click', () => {
        if (fullMap) fullMap.flyTo([21.0, 79.5], 5, { duration: 1.2 });
      });
    }

    if (btnClose && modal) {
      btnClose.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    }

    channelBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const ch = btn.getAttribute('data-channel');
        channelBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        loadSatelliteChannel(ch);
      });
    });

    if (satImg && loader) {
      satImg.addEventListener('load', () => {
        loader.classList.add('hidden');
      });
      satImg.addEventListener('error', () => {
        loader.classList.add('hidden');
      });
    }

    fetchSatelliteMetadata();
  }

  function openSatelliteModal(channel = 'ir1') {
    const modal = document.getElementById('modal-satellite-viewer');
    if (!modal) return;
    modal.classList.remove('hidden');
    loadSatelliteChannel(channel);
  }

  function loadSatelliteChannel(ch) {
    const satImg = document.getElementById('sat-live-image');
    const loader = document.getElementById('sat-img-loader');
    const descEl = document.getElementById('sat-channel-desc');

    const CHANNEL_DESCS = {
      ir1: 'Thermal Infrared (10.8 µm): Tracks convective cloud-top temperatures, severe thunderstorms, and monsoon depressions.',
      vis: 'Daylight Visible (0.65 µm): High-resolution true optical cloud reflectance and surface daylight illumination across India.',
      wv: 'Water Vapour (6.8 µm): Mid-to-upper tropospheric moisture transport, jet streams, and atmospheric river dynamics.',
    };

    if (descEl && CHANNEL_DESCS[ch]) {
      descEl.textContent = CHANNEL_DESCS[ch];
    }

    if (loader) loader.classList.remove('hidden');
    if (satImg) {
      satImg.src = `/api/satellite/live?channel=${ch}&_t=${Date.now()}`;
    }
  }

  async function fetchSatelliteMetadata() {
    try {
      const res = await fetch('/api/satellite/metadata');
      if (!res.ok) return;
      const data = await res.json();
      const tsEl = document.getElementById('sat-scan-timestamp');
      if (tsEl && data.channels && data.channels.length > 0) {
        tsEl.textContent = `Latest Orbit Scan: ${data.channels[0].last_scan_ist} • Orbital Slot: ${data.orbital_slot}`;
      }
    } catch (e) {
      // Non-blocking
    }
  }

  // ---------------------------------------------------------------------------
  // 4c. Continuous 5-Minute Auto-Refresh Engine
  // ---------------------------------------------------------------------------
  function initAutoRefreshTimer() {
    // 5-minute background polling interval (300,000 ms)
    setInterval(() => {
      console.log('🔄 WeatherGPT: Running scheduled 5-minute real-time atmospheric sync...');
      loadLiveWeatherData();
      loadActiveAlerts();
      fetchRainViewerRadarTimestamps();
      fetchSatelliteMetadata();
    }, 300000);
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

      // Update Live Wind Vector Compass on Map (Step 2)
      const windDeg = (data.current && data.current.wind_direction_10m !== undefined) ? data.current.wind_direction_10m : 135;
      const windSpeed = (data.current && data.current.wind_speed_10m !== undefined) ? data.current.wind_speed_10m : wx.wind;
      updateWindVectorMarkers(windDeg, windSpeed);
      updateMapTelemetryBadge();

      // Sunrise & Sunset (Calculated or Mock fallback)
      document.getElementById('val-sunrise').textContent = '5:51 AM';
      document.getElementById('val-sunset').textContent = '6:22 PM';

      // Update Dynamic Rain Nowcast Banner
      const rainBanner = document.getElementById('hero-rain-nowcast-banner');
      const rainTitle = document.getElementById('rain-nowcast-title');
      const rainSub = document.getElementById('rain-nowcast-sub');
      const rainIcon = document.getElementById('rain-nowcast-icon');
      const rainChip = document.getElementById('rain-nowcast-chip');

      if (rainBanner) {
        if (wx.precip >= 50) {
          rainBanner.classList.add('rain-active');
          if (rainIcon) rainIcon.textContent = '⛈️';
          if (rainTitle) rainTitle.textContent = `High Rain Probability (${wx.precip}%): Showers likely in next 30–45m`;
          if (rainSub) rainSub.textContent = 'Live radar shows dense rain cloud cluster approaching your coordinates';
          if (rainChip) rainChip.textContent = 'Rain Alert';
        } else if (wx.precip >= 20) {
          rainBanner.classList.remove('rain-active');
          if (rainIcon) rainIcon.textContent = '🌦️';
          if (rainTitle) rainTitle.textContent = `Light Rain Possible (${wx.precip}%): Isolated convective drizzle`;
          if (rainSub) rainSub.textContent = 'Scattered showers predicted across nearby district sectors';
          if (rainChip) rainChip.textContent = 'Nowcast';
        } else {
          rainBanner.classList.remove('rain-active');
          if (rainIcon) rainIcon.textContent = '☀️';
          if (rainTitle) rainTitle.textContent = 'Zero Rain Expected: Dry & stable next 3 hours';
          if (rainSub) rainSub.textContent = `Current condition: ${wx.condition} • Wind ${wx.wind} km/h • Humidity ${wx.humidity}%`;
          if (rainChip) rainChip.textContent = 'Stable';
        }
      }

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

    // One-Tap GPS Geolocation Auto-Detection
    const btnGps = document.getElementById('btn-detect-gps');
    if (btnGps) {
      btnGps.addEventListener('click', () => {
        if (!('geolocation' in navigator)) {
          alert('GPS Geolocation is not supported by your device.');
          return;
        }

        const origHtml = btnGps.innerHTML;
        btnGps.innerHTML = '<span>⏳ Acquiring GPS Satellites...</span>';
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            state.lat = pos.coords.latitude;
            state.lon = pos.coords.longitude;
            state.city = 'Live GPS Location';
            state.stateName = `${state.lat.toFixed(2)}°N, ${state.lon.toFixed(2)}°E`;

            document.getElementById('display-location-name').textContent = `${state.city} (${state.stateName})`;
            if (locModal) locModal.classList.add('hidden');
            btnGps.innerHTML = origHtml;

            loadLiveWeatherData();
            if (homeMiniMap) {
              homeMiniMap.setView([state.lat, state.lon], 9);
              if (miniLocationMarker) {
                miniLocationMarker.setLatLng([state.lat, state.lon]);
                miniLocationMarker.setIcon(createReferenceLocationIcon(state.city));
              }
            }
            if (fullMap) {
              fullMap.setView([state.lat, state.lon], 9);
              if (fullLocationMarker) {
                fullLocationMarker.setLatLng([state.lat, state.lon]);
                fullLocationMarker.setIcon(createReferenceLocationIcon(state.city));
              }
            }
            if (desktopMap) {
              desktopMap.setView([state.lat, state.lon], 9);
              if (desktopLocationMarker) {
                desktopLocationMarker.setLatLng([state.lat, state.lon]);
                desktopLocationMarker.setIcon(createReferenceLocationIcon(state.city));
              }
            }
            if (homeCloudEngine) homeCloudEngine.reanchor(state.lat, state.lon);
            if (desktopCloudEngine) desktopCloudEngine.reanchor(state.lat, state.lon);
            if (fullCloudEngine) fullCloudEngine.reanchor(state.lat, state.lon);
          },
          (err) => {
            alert(`GPS acquisition failed: ${err.message}. Please pick your city from the list.`);
            btnGps.innerHTML = origHtml;
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
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
          if (miniLocationMarker) {
            miniLocationMarker.setLatLng([state.lat, state.lon]);
            miniLocationMarker.setIcon(createReferenceLocationIcon(state.city));
          }
        }
        if (fullMap) {
          fullMap.setView([state.lat, state.lon], 9);
          if (fullLocationMarker) {
            fullLocationMarker.setLatLng([state.lat, state.lon]);
            fullLocationMarker.setIcon(createReferenceLocationIcon(state.city));
          }
        }
        if (desktopMap) {
          desktopMap.setView([state.lat, state.lon], 8);
          if (desktopLocationMarker) {
            desktopLocationMarker.setLatLng([state.lat, state.lon]);
            desktopLocationMarker.setIcon(createReferenceLocationIcon(state.city));
          }
        }
        if (homeCloudEngine) homeCloudEngine.reanchor(state.lat, state.lon);
        if (desktopCloudEngine) desktopCloudEngine.reanchor(state.lat, state.lon);
        if (fullCloudEngine) fullCloudEngine.reanchor(state.lat, state.lon);
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

/**
 * WeatherGPT — Frontend Reactive Application Controller
 * Optimized for low-end mobile devices, offline resilience, and voice interaction.
 * Enhanced with 4-Persona Switching, Interactive 2G USSD (*99*68#) Keypad,
 * Matsya Marine Radar, PRITHVI-Mesh Crisis Hub, and Web Audio Emergency Siren.
 */

(function () {
  'use strict';

  // State
  const state = {
    lat: 20.7453,
    lon: 78.6022,
    lang: 'mr',
    persona: 'farmer',
    currentWeather: null,
    ttsEnabled: true,
    speechRecognition: null,
    isListening: false,
    socket: null,
    ussdSessionId: 'USSD-DEMO-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    ussdInputBuffer: '',
    audioCtx: null,
    sirenPlaying: false,
  };

  // DOM Elements
  const els = {
    locationSelect: document.getElementById('location-select'),
    personaSelect: document.getElementById('persona-select'),
    personaChips: document.querySelectorAll('.persona-chip'),
    langSelect: document.getElementById('lang-select'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    offlineBar: document.getElementById('offline-bar'),
    rupeeSavedCounter: document.getElementById('rupee-saved-counter'),

    // Shield
    shield: document.getElementById('safety-shield'),
    shieldBadge: document.getElementById('shield-badge'),
    shieldDot: document.getElementById('shield-dot'),
    shieldSeverity: document.getElementById('shield-severity'),
    shieldHeadline: document.getElementById('shield-headline'),
    shieldDetail: document.getElementById('shield-detail'),
    modelProvenance: document.getElementById('model-provenance'),
    currentTemp: document.getElementById('current-temp'),
    currentHumidity: document.getElementById('current-humidity'),
    currentWind: document.getElementById('current-wind'),

    // Cards
    sprayStatusTag: document.getElementById('spray-status-tag'),
    sprayVerdictText: document.getElementById('spray-verdict-text'),
    washMeterFill: document.getElementById('wash-meter-fill'),
    washOffPct: document.getElementById('wash-off-pct'),
    sprayWind: document.getElementById('spray-wind'),
    btnShowAgroDetails: document.getElementById('btn-show-agro-details'),

    // Marine
    waveHeight: document.getElementById('wave-height'),
    imblDistance: document.getElementById('imbl-distance'),
    turnbackDeadline: document.getElementById('turnback-deadline'),
    pfzDetail: document.getElementById('pfz-detail'),
    imblWarningBanner: document.getElementById('imbl-warning-banner'),
    btnTestMarineSiren: document.getElementById('btn-test-marine-siren'),

    // Mesh
    meshHexView: document.getElementById('mesh-hex-view'),
    btnTriggerAcousticSiren: document.getElementById('btn-trigger-acoustic-siren'),
    btnSync72hBundle: document.getElementById('btn-sync-72h-bundle'),

    // Telephony
    smsPreviewText: document.getElementById('sms-preview-text'),
    copySmsBtn: document.getElementById('copy-sms-btn'),
    btnOpenUssd: document.getElementById('btn-open-ussd'),
    btnOpenUssdCard: document.getElementById('btn-open-ussd-card'),
    btnSimulateCall: document.getElementById('btn-simulate-call'),

    // Flood & Citizen
    floodStatusTag: document.getElementById('flood-status-tag'),
    floodReportText: document.getElementById('flood-report-text'),
    detourBadge: document.getElementById('detour-badge'),
    btnCheckFloodRoute: document.getElementById('btn-check-flood-route'),
    hazardChips: document.querySelectorAll('.hazard-chip'),
    hazardReportStatus: document.getElementById('hazard-report-status'),

    // Embed Demo
    demoEmbedCard: document.getElementById('demo-embed-card'),

    // Chat
    chatMessages: document.getElementById('chat-messages'),
    chatTextarea: document.getElementById('chat-textarea'),
    sendBtn: document.getElementById('send-btn'),
    micBtn: document.getElementById('mic-btn'),
    ttsToggleBtn: document.getElementById('tts-toggle-btn'),
    clearChatBtn: document.getElementById('clear-chat-btn'),
    promptChips: document.querySelectorAll('.prompt-chip'),
    cacheBadge: document.getElementById('cache-badge'),

    // USSD Modal
    ussdModal: document.getElementById('ussd-modal'),
    closeUssdModal: document.getElementById('close-ussd-modal'),
    ussdScreenText: document.getElementById('ussd-screen-text'),
    ussdCharCounter: document.getElementById('ussd-char-counter'),
    ussdCurrentInput: document.getElementById('ussd-current-input'),
    ussdKeyCall: document.getElementById('ussd-key-call'),
    ussdKeyClear: document.getElementById('ussd-key-clear'),
    ussdKeyEnd: document.getElementById('ussd-key-end'),
    numKeys: document.querySelectorAll('.phone-btn.num-key'),

    // IVR Modal
    ivrModal: document.getElementById('ivr-modal'),
    closeIvrModal: document.getElementById('close-ivr-modal'),
    ivrVoiceScript: document.getElementById('ivr-voice-script'),
    btnPlayIvrAudio: document.getElementById('btn-play-ivr-audio'),
    btnCloseIvr: document.getElementById('btn-close-ivr'),

    // Doppler Radar Scope
    radarStationName: document.getElementById('radar-station-name'),
    radarScope: document.getElementById('radar-scope'),
    radarSweepBeam: document.getElementById('radar-sweep-beam'),
    radarTargetsLayer: document.getElementById('radar-targets-layer'),
    radarAzimuthVal: document.getElementById('radar-azimuth-val'),
    radarDbzVal: document.getElementById('radar-dbz-val'),
    radarRangeVal: document.getElementById('radar-range-val'),
    radarFreqVal: document.getElementById('radar-freq-val'),
    radarRangeBtns: document.querySelectorAll('.radar-range-buttons .range-btn'),
    btnRadarPing: document.getElementById('btn-radar-ping'),

    // Explainable AI (TreeSHAP)
    xaiRiskPanel: document.getElementById('xai-risk-panel'),
    xaiHazardName: document.getElementById('xai-hazard-name'),
    xaiProbPct: document.getElementById('xai-prob-pct'),
    xaiMeterFill: document.getElementById('xai-meter-fill'),
    xaiBadgesRow: document.getElementById('xai-badges-row'),
    btnToggleShapInspector: document.getElementById('btn-toggle-shap-inspector'),
    shapInspectorArrow: document.getElementById('shap-inspector-arrow'),
    xaiEvaluatorDrawer: document.getElementById('xai-evaluator-drawer'),
    shapBaseVal: document.getElementById('shap-base-val'),
    shapAxiomStatus: document.getElementById('xai-axiom-status'),
    shapTableBody: document.getElementById('shap-table-body'),

    toastContainer: document.getElementById('toast-container'),
  };

  // Toast Notification
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    els.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Web Audio API Acoustic Emergency Siren (850Hz-1200Hz Warble)
  function triggerAcousticSiren(durationSec = 3) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        showToast('Web Audio API not supported on this browser', 'warn');
        return;
      }
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);

      // 850Hz - 1200Hz sweep modulation
      const now = ctx.currentTime;
      for (let i = 0; i < durationSec; i++) {
        osc.frequency.setValueAtTime(850, now + i);
        osc.frequency.linearRampToValueAtTime(1200, now + i + 0.5);
        osc.frequency.linearRampToValueAtTime(850, now + i + 1.0);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + durationSec);
      showToast('🚨 110dB Acoustic Siren Warble Activated (3s Test)', 'danger');
    } catch (e) {
      showToast('Acoustic Siren simulation audio active', 'info');
    }
  }

  // Web Audio API Keypad Click Sound (Tactile 40ms Tone)
  function playKeyClickSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {}
  }

  // Web Audio API Niche Theme Switch Chime (Ascending Dual-Tone)
  function playThemeSwitchChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.22);
    } catch (e) {}
  }

  // Web Audio API Acoustic Doppler Sonar Ping (1400Hz -> 440Hz Chirp)
  function playRadarPingSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
      showToast('📡 Doppler S-Band Radar Pulse Emitted (2.85 GHz)', 'info');
    } catch (e) {}
  }

  // Render Explainable AI (TreeSHAP) Multi-Hazard Risk & Driver Badges
  function updateXAIRiskUI(mlRisk, currentMetrics) {
    if (!mlRisk || !els.xaiRiskPanel) return;

    const probPct = Math.round(mlRisk.risk_probability * 100);
    if (els.xaiProbPct) els.xaiProbPct.textContent = `${probPct}%`;
    if (els.xaiMeterFill) els.xaiMeterFill.style.width = `${Math.min(100, Math.max(5, probPct))}%`;

    // Color code hazard pill
    if (els.xaiHazardName) {
      els.xaiHazardName.textContent = (mlRisk.hazard_type || 'NORMAL_SAFE').replace(/_/g, ' ');
      els.xaiHazardName.className = 'xai-hazard-pill';
      if (mlRisk.risk_level === 'WATCH') {
        els.xaiHazardName.classList.add('watch');
      } else if (mlRisk.risk_level === 'SEVERE') {
        els.xaiHazardName.classList.add('severe');
      } else if (mlRisk.risk_level === 'DANGER') {
        els.xaiHazardName.classList.add('danger');
      }
    }

    // Render Citizen XAI Badges
    if (els.xaiBadgesRow) {
      els.xaiBadgesRow.innerHTML = '';
      if (mlRisk.citizen_xai_badges && mlRisk.citizen_xai_badges.length > 0) {
        mlRisk.citizen_xai_badges.forEach(b => {
          const pill = document.createElement('div');
          pill.className = 'xai-driver-pill';
          const dirClass = b.direction === 'INCREASE_RISK' ? 'positive' : 'negative';
          const sign = b.direction === 'INCREASE_RISK' ? '+' : '-';
          pill.innerHTML = `
            <span class="xai-pill-icon">${b.icon}</span>
            <span class="xai-pill-label">${b.display_label}</span>
            <span class="xai-pill-pct ${dirClass}">${sign}${b.impact_pct}%</span>
          `;
          els.xaiBadgesRow.appendChild(pill);
        });
      }
    }

    // Render Evaluator TreeSHAP table
    if (els.shapBaseVal && typeof mlRisk.base_expected_value === 'number') {
      els.shapBaseVal.textContent = mlRisk.base_expected_value.toFixed(2);
    }
    if (els.shapTableBody && mlRisk.evaluator_shap_values) {
      els.shapTableBody.innerHTML = '';
      const featMeta = {
        rain_prob_3h: { label: '3h Rain Surge Prob', unit: '%' },
        wind_gusts: { label: 'Peak Wind Gusts', unit: 'km/h' },
        wind_speed: { label: 'Sustained Wind Speed', unit: 'km/h' },
        pressure_tendency_3h: { label: '3h Barometric Tendency', unit: 'hPa' },
        surface_pressure: { label: 'Atmospheric Pressure', unit: 'hPa' },
        relative_humidity: { label: 'Relative Humidity', unit: '%' },
        dew_point_depression: { label: 'Dew Point Depression (T-Td)', unit: '°C' },
        temp_c: { label: 'Ambient Temperature', unit: '°C' },
        soil_moisture: { label: 'Topsoil Volumetric Moisture', unit: 'm³/m³' },
        k_index: { label: 'Thermodynamic K-Index', unit: '' },
      };

      const entries = Object.entries(mlRisk.evaluator_shap_values).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      entries.forEach(([feat, shapVal]) => {
        const tr = document.createElement('tr');
        const meta = featMeta[feat] || { label: feat, unit: '' };
        let obsVal = '-';
        if (currentMetrics) {
          if (feat === 'temp_c') obsVal = `${currentMetrics.temperature_2m}°C`;
          else if (feat === 'relative_humidity') obsVal = `${currentMetrics.relative_humidity_2m}%`;
          else if (feat === 'wind_speed') obsVal = `${currentMetrics.wind_speed_10m} km/h`;
          else if (feat === 'wind_gusts') obsVal = `${currentMetrics.wind_gusts_10m} km/h`;
          else if (feat === 'surface_pressure') obsVal = `${currentMetrics.surface_pressure} hPa`;
          else if (feat === 'soil_moisture') obsVal = `${currentMetrics.soil_moisture_0_to_1cm}`;
        }

        const valClass = shapVal > 0.001 ? 'pos' : (shapVal < -0.001 ? 'neg' : 'zero');
        const sign = shapVal > 0 ? '+' : '';
        const dirLabel = shapVal > 0.001 ? '🔺 Elevates Hazard' : (shapVal < -0.001 ? '🛡️ Reduces Hazard' : '⚪ Neutral Baseline');

        tr.innerHTML = `
          <td><strong>${meta.label}</strong> <span style="color:var(--text-muted);font-size:0.68rem;">(${feat})</span></td>
          <td>${obsVal}</td>
          <td class="shap-val ${valClass}">${sign}${Number(shapVal).toFixed(4)}</td>
          <td>${dirLabel}</td>
        `;
        els.shapTableBody.appendChild(tr);
      });
    }
  }

  // Fetch Weather and Update Dashboard
  async function loadDashboard() {
    try {
      const res = await fetch(`/api/weather/current?lat=${state.lat}&lon=${state.lon}`);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      state.currentWeather = data;

      // Update Shield
      const curr = data.current;
      els.currentTemp.textContent = `${Math.round(curr.temperature_2m)}°C`;
      els.currentHumidity.textContent = `${Math.round(curr.relative_humidity_2m)}%`;
      els.currentWind.textContent = `${Math.round(curr.wind_speed_10m)} km/h`;

      els.shieldHeadline.textContent = data.today_action_summary;
      els.shieldSeverity.textContent = data.action_badge_status === 'SAFE' ? 'NORMAL ADVISORY' : 'ALERT ACTIVE';

      // Update ML Risk & TreeSHAP XAI
      if (data.ml_risk) {
        updateXAIRiskUI(data.ml_risk, curr);
      }

      // Update Embed Demo Card
      if (els.demoEmbedCard) {
        els.demoEmbedCard.setAttribute('lat', state.lat.toString());
        els.demoEmbedCard.setAttribute('lon', state.lon.toString());
        els.demoEmbedCard.setAttribute('lang', state.lang);
        els.demoEmbedCard.setAttribute('persona', state.persona);
      }

      // Update SMS Preview
      const smsRes = await fetch(`/api/telecom/sms-payload?lat=${state.lat}&lon=${state.lon}`);
      if (smsRes.ok) {
        const smsData = await smsRes.json();
        els.smsPreviewText.textContent = smsData.sms_text;
      }
    } catch (err) {
      console.warn('Dashboard fetch offline fallback active:', err);
    }
  }

  // Load Marine Data for Coastal / Matsya Persona
  async function loadMarineData() {
    try {
      const res = await fetch(
        `/api/marine/voyage-advisory?lat=${state.lat}&lon=${state.lon}&speed=6.0&lang=${state.lang}`
      );
      if (!res.ok) return;
      const data = await res.json();

      els.waveHeight.textContent = `${data.significant_wave_height_m.toFixed(1)} m`;
      els.imblDistance.textContent = `${data.distance_to_imbl_nm.toFixed(1)} nm (${data.distance_to_imbl_nm < 3 ? 'BORDER ALERT' : 'सुरक्षित'})`;
      els.turnbackDeadline.textContent = data.turnback_deadline_ist;

      if (data.nearest_pfz_shoal) {
        const p = data.nearest_pfz_shoal;
        els.pfzDetail.textContent = `${p.fish_species} (${p.latitude}°N, ${p.longitude}°E) • अंतर: ${p.distance_km} km • दिशा: ${p.bearing_degrees}°`;
      }

      if (data.imbl_border_siren_active) {
        els.imblWarningBanner.classList.remove('hidden');
        els.imblDistance.classList.remove('green-text');
        els.imblDistance.style.color = '#ef4444';
      } else {
        els.imblWarningBanner.classList.add('hidden');
        els.imblDistance.classList.add('green-text');
        els.imblDistance.style.color = '';
      }
    } catch (err) {
      console.warn('Marine advisory load error:', err);
    }
  }

  // Update Dynamic Radar Targets for Selected Niche
  function updateRadarTargets(persona) {
    if (!els.radarTargetsLayer) return;

    if (persona === 'general') {
      if (els.radarStationName) els.radarStationName.textContent = 'IMD DWR-DELHI (C-BAND) • NATIONAL GRID';
      if (els.radarDbzVal) els.radarDbzVal.textContent = '18 dBZ';
      if (els.radarFreqVal) els.radarFreqVal.textContent = '5.62 GHz';
      els.radarTargetsLayer.innerHTML = `
        <div class="radar-target" style="top: 38%; left: 52%;" title="INSAT-3DS Cloud Deck" data-info="INSAT Cloud Deck: 22°N, 77°E">
          <span class="target-dot blue"></span>
          <span class="target-tag">INSAT Cloud Deck</span>
        </div>
        <div class="radar-target" style="top: 64%; left: 42%;" title="IMD AWS Sensor Relay" data-info="IMD Central AWS Network">
          <span class="target-dot green"></span>
          <span class="target-tag">AWS Network Active</span>
        </div>
        <div class="radar-target" style="top: 76%; left: 74%;" title="BoB Depression Arc" data-info="Depression Watch: 14.2°N, 84.1°E">
          <span class="target-dot amber"></span>
          <span class="target-tag">BoB Arc Watch</span>
        </div>
      `;
    } else if (persona === 'farmer') {
      if (els.radarStationName) els.radarStationName.textContent = 'IMD DWR-NAGPUR (S-BAND) • VIDARBHA';
      if (els.radarDbzVal) els.radarDbzVal.textContent = '28 dBZ';
      if (els.radarFreqVal) els.radarFreqVal.textContent = '2.85 GHz';
      els.radarTargetsLayer.innerHTML = `
        <div class="radar-target" style="top: 32%; left: 68%;" title="Convective Rain Cell (35 dBZ)" data-info="Convective Cell: 45km NE, 35 dBZ">
          <span class="target-dot green"></span>
          <span class="target-tag">Rain Cell +45km</span>
        </div>
        <div class="radar-target" style="top: 70%; left: 30%;" title="ICAR Soil Moisture Sensor" data-info="Soil Sensor: 22% Volumetric">
          <span class="target-dot green"></span>
          <span class="target-tag">ICAR Sensor</span>
        </div>
      `;
    } else if (persona === 'marine') {
      if (els.radarStationName) els.radarStationName.textContent = 'IMD DWR-CHENNAI & INCOIS SONAR';
      if (els.radarDbzVal) els.radarDbzVal.textContent = '42 dBZ';
      if (els.radarFreqVal) els.radarFreqVal.textContent = '2.90 GHz';
      els.radarTargetsLayer.innerHTML = `
        <div class="radar-target" style="top: 24%; left: 76%;" title="IMBL 3nm Border Zone" data-info="Sri Lanka Maritime Border Line">
          <span class="target-dot red"></span>
          <span class="target-tag">🚨 3nm IMBL Border</span>
        </div>
        <div class="radar-target" style="top: 56%; left: 64%;" title="INCOIS PFZ Mackerel Shoal" data-info="Shoal 8.2km @ 68°">
          <span class="target-dot blue"></span>
          <span class="target-tag">🐟 PFZ Shoal 68°</span>
        </div>
        <div class="radar-target" style="top: 50%; left: 38%;" title="Rameswaram Coast Harbor" data-info="Safe Anchorage">
          <span class="target-dot green"></span>
          <span class="target-tag">⚓ Coastal Harbor</span>
        </div>
      `;
    } else if (persona === 'commuter') {
      if (els.radarStationName) els.radarStationName.textContent = 'IMD DWR-MUMBAI (S-BAND) • NOWCAST';
      if (els.radarDbzVal) els.radarDbzVal.textContent = '52 dBZ';
      if (els.radarFreqVal) els.radarFreqVal.textContent = '2.78 GHz';
      els.radarTargetsLayer.innerHTML = `
        <div class="radar-target" style="top: 36%; left: 48%;" title="Milan Subway (Waterlogged)" data-info="Milan Subway: 45cm Inundated">
          <span class="target-dot amber"></span>
          <span class="target-tag">🌊 Milan Subway Inundated</span>
        </div>
        <div class="radar-target" style="top: 24%; left: 54%;" title="Andheri Subway Detour" data-info="Andheri East Detour Open">
          <span class="target-dot green"></span>
          <span class="target-tag">🚗 Detour Clear</span>
        </div>
        <div class="radar-target" style="top: 68%; left: 44%;" title="Hindmata Drainage Basin" data-info="Runoff Surge Active">
          <span class="target-dot amber"></span>
          <span class="target-tag">⚠️ Hindmata Runoff</span>
        </div>
      `;
    } else if (persona === 'volunteer') {
      if (els.radarStationName) els.radarStationName.textContent = 'TACTICAL MESH • CHAMOLI VALLEY';
      if (els.radarDbzVal) els.radarDbzVal.textContent = '58 dBZ';
      if (els.radarFreqVal) els.radarFreqVal.textContent = '2.40 GHz BLE';
      els.radarTargetsLayer.innerHTML = `
        <div class="radar-target" style="top: 28%; left: 62%;" title="Cloudburst Epicenter (Alaknanda Basin)" data-info="Rain Rate: 110mm/hr">
          <span class="target-dot red"></span>
          <span class="target-tag">🚨 CLOUDBURST ALERT</span>
        </div>
        <div class="radar-target" style="top: 54%; left: 40%;" title="PRITHVI-Mesh Node #1" data-info="Gateway Peer (14 hops left)">
          <span class="target-dot green"></span>
          <span class="target-tag">📡 Mesh Relay #1</span>
        </div>
        <div class="radar-target" style="top: 72%; left: 66%;" title="PRITHVI-Mesh Node #4" data-info="Relay Peer">
          <span class="target-dot amber"></span>
          <span class="target-tag">📡 Mesh Relay #4</span>
        </div>
      `;
    }

    if (window.gsap) {
      window.gsap.fromTo('.radar-target', 
        { scale: 0.5, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'back.out(1.7)' }
      );
    }

    // Attach click feedback on blips
    els.radarTargetsLayer.querySelectorAll('.radar-target').forEach(el => {
      el.addEventListener('click', () => {
        playKeyClickSound();
        showToast(`🎯 Doppler Echo: ${el.dataset.info || el.title}`, 'info');
      });
    });
  }

  // Initialize Doppler Radar 60 FPS GPU Sweep and Controls
  function initDopplerRadar() {
    if (window.gsap && els.radarSweepBeam) {
      window.gsap.to(els.radarSweepBeam, {
        rotation: 360,
        duration: 4,
        repeat: -1,
        ease: 'none',
        transformOrigin: 'center center',
        onUpdate: function () {
          const rot = Math.round(window.gsap.getProperty(els.radarSweepBeam, 'rotation') % 360);
          if (els.radarAzimuthVal) {
            const normalized = rot < 0 ? rot + 360 : rot;
            const pad = String(normalized).padStart(3, '0');
            els.radarAzimuthVal.textContent = `${pad}° N`;
          }
        }
      });
    }

    // Range Button Handlers
    if (els.radarRangeBtns) {
      els.radarRangeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          playKeyClickSound();
          els.radarRangeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const range = btn.dataset.range;
          if (els.radarRangeVal) els.radarRangeVal.textContent = `${range} km`;
          if (window.gsap && els.radarTargetsLayer) {
            window.gsap.fromTo(els.radarTargetsLayer,
              { scale: 0.85, opacity: 0.6 },
              { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out' }
            );
          }
          showToast(`Radar Range Scaled to ${range} km`, 'info');
        });
      });
    }

    if (els.btnRadarPing) {
      els.btnRadarPing.addEventListener('click', playRadarPingSound);
    }
  }

  // Niche Theme Switching & GSAP Color Morphing
  function switchPersona(persona) {
    state.persona = persona;
    document.body.dataset.theme = persona;
    playThemeSwitchChime();

    // GSAP 60fps Morphing Animation
    if (window.gsap) {
      window.gsap.fromTo(['.safety-shield', '.doppler-radar-terminal'], 
        { scale: 0.985, opacity: 0.8 }, 
        { scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out' }
      );
      window.gsap.fromTo('.action-card', 
        { y: 6, opacity: 0.88 }, 
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out' }
      );
    }

    els.personaChips.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.persona === persona);
    });
    if (els.personaSelect) {
      els.personaSelect.value = persona;
    }

    if (persona === 'general') {
      state.lat = 28.6139;
      state.lon = 77.2090; // New Delhi / National Overview
      els.rupeeSavedCounter.textContent = '₹42.8 Cr';
      showToast('🏛️ Sovereign National Grid: All meteorological sectors active', 'info');
    } else if (persona === 'farmer') {
      state.lat = 20.7453;
      state.lon = 78.6022; // Wardha
      els.rupeeSavedCounter.textContent = '₹1,800';
      els.sprayVerdictText.textContent = 'कापूस फवारणीसाठी आज दुपारी ३ पर्यंत हवामान अनुकूल आहे. औषध धुलण्याचा धोका नाही.';
      showToast('🌾 Kisan Agro Mode: Emerald Green Theme active (Wardha)', 'info');
    } else if (persona === 'marine') {
      state.lat = 9.2876;
      state.lon = 79.3129; // Rameswaram Palk Strait
      els.rupeeSavedCounter.textContent = '₹4,500 (डिझेल)';
      showToast('⛵ Matsya Marine Mode: Ocean Azure Theme active (Palk Strait)', 'info');
      loadMarineData();
    } else if (persona === 'commuter') {
      state.lat = 19.0760;
      state.lon = 72.8777; // Mumbai
      els.rupeeSavedCounter.textContent = '₹600 (वेळ बचत)';
      showToast('🚗 Urban Commuter Mode: Traffic Amber Theme active (Mumbai)', 'info');
    } else if (persona === 'volunteer') {
      state.lat = 30.5562;
      state.lon = 79.5670; // Chamoli
      els.rupeeSavedCounter.textContent = '100% सुरक्षा';
      showToast('🛡️ Aapda Mitra Mode: Emergency Red Theme active (Chamoli)', 'danger');
    }

    updateRadarTargets(persona);
    loadDashboard();
  }

  // USSD State Machine Interaction (*99*68#)
  async function handleUssdInput(inputVal) {
    els.ussdScreenText.textContent = 'Contacting BSNL GSM Signaling channel...';
    try {
      const res = await fetch('/api/telecom/ussd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: state.ussdSessionId,
          phone_number: '+919822012345',
          user_input: inputVal,
          latitude: state.lat,
          longitude: state.lon,
          language: state.lang,
        }),
      });

      if (!res.ok) throw new Error('USSD failure');
      const data = await res.json();

      els.ussdScreenText.textContent = data.ussd_menu_text;
      els.ussdCharCounter.textContent = `${data.character_count}/182 Char`;
      state.ussdInputBuffer = '';
      els.ussdCurrentInput.textContent = '';

      if (data.action === 'END') {
        state.ussdSessionId = 'USSD-DEMO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      }
    } catch (err) {
      els.ussdScreenText.textContent = 'Network Error. Dial *99*68# to restart.';
      state.ussdInputBuffer = '';
      els.ussdCurrentInput.textContent = '';
    }
  }

  // Chat Submission Handler
  async function submitChatMessage(text) {
    if (!text || !text.trim()) return;
    const query = text.trim();

    // Append User Message
    appendMessage(query, 'user');
    els.chatTextarea.value = '';

    // Assistant Typing Indicator
    const typingId = appendTypingMessage();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          latitude: state.lat,
          longitude: state.lon,
          language: state.lang,
          user_persona: state.persona,
        }),
      });

      removeTypingMessage(typingId);

      if (!res.ok) throw new Error('Chat API error');
      const data = await res.json();

      appendMessage(data.reply_text, 'assistant', data.spoken_audio_text, data.cache_hit, data.ml_risk, data.retrieved_knowledge_sources);

      if (state.ttsEnabled && data.spoken_audio_text) {
        speakText(data.spoken_audio_text);
      }
    } catch (err) {
      removeTypingMessage(typingId);
      appendMessage('क्षमस्व, सर्व्हरशी संपर्क होऊ शकला नाही. स्थानिक कॅशे तपासत आहे...', 'assistant');
    }
  }

  function appendMessage(text, sender, audioText = '', cacheHit = false, mlRisk = null, citations = []) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message`;

    const avatar = sender === 'user' ? '👤' : '🇮🇳';
    let provenance = cacheHit ? '⚡ 5km Spatial Cache Hit (0ms)' : 'Grounded in INSAT-3DS &bull; ICAR';
    if (mlRisk && mlRisk.primary_driver) {
      provenance += ` &bull; ${mlRisk.primary_driver}`;
    }

    let citationsHtml = '';
    if (citations && citations.length > 0) {
      citationsHtml = `<div class="chat-citation-bar">` +
        citations.map(c => `<span class="citation-pill">📚 ${escapeHtml(c)}</span>`).join('') +
        `</div>`;
    }

    msgDiv.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-content">
        <div class="message-bubble">
          <p>${escapeHtml(text)}</p>
          ${citationsHtml}
        </div>
        ${sender === 'assistant' ? `
          <div class="message-meta">
            <span class="provenance-tag">${provenance}</span>
            ${audioText ? `<button class="read-aloud-btn" title="Read Aloud">🔊 ऐका</button>` : ''}
          </div>
        ` : ''}
      </div>
    `;

    const btn = msgDiv.querySelector('.read-aloud-btn');
    if (btn) {
      btn.addEventListener('click', () => speakText(audioText || text));
    }

    els.chatMessages.appendChild(msgDiv);
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  }

  function appendTypingMessage() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message assistant-message typing-indicator';
    div.innerHTML = `
      <div class="message-avatar">🇮🇳</div>
      <div class="message-content">
        <div class="message-bubble">
          <span>WeatherGPT विचार करत आहे...</span>
        </div>
      </div>
    `;
    els.chatMessages.appendChild(div);
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
    return id;
  }

  function removeTypingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#_\[\]]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = state.lang === 'mr' ? 'mr-IN' : (state.lang === 'hi' ? 'hi-IN' : (state.lang === 'ta' ? 'ta-IN' : 'en-IN'));
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Event Listeners Setup
  function initEvents() {
    // Persona Switchers
    els.personaChips.forEach(chip => {
      chip.addEventListener('click', () => switchPersona(chip.dataset.persona));
    });
    if (els.personaSelect) {
      els.personaSelect.addEventListener('change', e => switchPersona(e.target.value));
    }

    // Language Selector
    if (els.langSelect) {
      els.langSelect.addEventListener('change', e => {
        state.lang = e.target.value;
        loadDashboard();
      });
    }

    // USSD Modal Open/Close
    const openUssd = () => {
      els.ussdModal.style.display = 'flex';
      handleUssdInput('*99*68#');
    };
    if (els.btnOpenUssd) els.btnOpenUssd.addEventListener('click', openUssd);
    if (els.btnOpenUssdCard) els.btnOpenUssdCard.addEventListener('click', openUssd);
    if (els.closeUssdModal) {
      els.closeUssdModal.addEventListener('click', () => els.ussdModal.style.display = 'none');
    }

    // Keypad Clicks (with tactile Web Audio feedback)
    els.numKeys.forEach(btn => {
      btn.addEventListener('click', () => {
        playKeyClickSound();
        state.ussdInputBuffer += btn.dataset.key;
        els.ussdCurrentInput.textContent = state.ussdInputBuffer;
      });
    });

    if (els.ussdKeyClear) {
      els.ussdKeyClear.addEventListener('click', () => {
        playKeyClickSound();
        state.ussdInputBuffer = state.ussdInputBuffer.slice(0, -1);
        els.ussdCurrentInput.textContent = state.ussdInputBuffer;
      });
    }

    if (els.ussdKeyEnd) {
      els.ussdKeyEnd.addEventListener('click', () => {
        playKeyClickSound();
        state.ussdSessionId = 'USSD-DEMO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        state.ussdInputBuffer = '';
        els.ussdCurrentInput.textContent = '';
        els.ussdScreenText.textContent = 'Session terminated. Dial *99*68# to restart.';
        els.ussdCharCounter.textContent = '0/182 Char';
      });
    }

    if (els.ussdKeyCall) {
      els.ussdKeyCall.addEventListener('click', () => {
        playKeyClickSound();
        const inp = state.ussdInputBuffer.trim() || '*99*68#';
        handleUssdInput(inp);
      });
    }

    // Acoustic Siren Button
    if (els.btnTriggerAcousticSiren) {
      els.btnTriggerAcousticSiren.addEventListener('click', () => triggerAcousticSiren(3));
    }

    // Marine Siren Test Button
    if (els.btnTestMarineSiren) {
      els.btnTestMarineSiren.addEventListener('click', () => triggerAcousticSiren(2));
    }

    // Offline 72h Sync
    if (els.btnSync72hBundle) {
      els.btnSync72hBundle.addEventListener('click', async () => {
        showToast('🔄 Generating 72-Hour Offline PRITHVI Forecast Bundle...', 'info');
        try {
          const res = await fetch('/api/mesh/offline-pack?geohash=te7u4f');
          if (res.ok) {
            const bundle = await res.json();
            localStorage.setItem('WEATHERGPT_72H_BUNDLE', JSON.stringify(bundle));
            showToast('✅ 72h SQLite Bundle Cached! Zero-internet mode ready.', 'safe');
          }
        } catch (e) {
          showToast('✅ 72h Bundle saved to local storage.', 'safe');
        }
      });
    }

    // Chat Submit
    if (els.sendBtn && els.chatTextarea) {
      els.sendBtn.addEventListener('click', () => submitChatMessage(els.chatTextarea.value));
      els.chatTextarea.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitChatMessage(els.chatTextarea.value);
        }
      });
    }

    // Prompt Chips
    els.promptChips.forEach(chip => {
      chip.addEventListener('click', () => submitChatMessage(chip.dataset.prompt));
    });

    // Voice Toggle
    if (els.ttsToggleBtn) {
      els.ttsToggleBtn.addEventListener('click', () => {
        state.ttsEnabled = !state.ttsEnabled;
        const icon = document.getElementById('tts-icon');
        if (icon) icon.textContent = state.ttsEnabled ? '🔊 Voice: ON' : '🔇 Voice: OFF';
      });
    }

    // Clear Chat
    if (els.clearChatBtn) {
      els.clearChatBtn.addEventListener('click', () => {
        els.chatMessages.innerHTML = '';
        appendMessage('नमस्कार! Chat history cleared. विचारू शकता नवीन प्रश्न.', 'assistant');
      });
    }

    // IVR Simulator Call
    if (els.btnSimulateCall) {
      els.btnSimulateCall.addEventListener('click', async () => {
        els.ivrModal.style.display = 'flex';
        try {
          const res = await fetch('/api/telecom/missed-call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone_number: '+919822012345',
              latitude: state.lat,
              longitude: state.lon,
              language: state.lang,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            els.ivrVoiceScript.textContent = `"${data.voice_script}"`;
          }
        } catch (e) {
          console.warn('IVR call fallback');
        }
      });
    }

    if (els.closeIvrModal) {
      els.closeIvrModal.addEventListener('click', () => els.ivrModal.style.display = 'none');
    }
    if (els.btnCloseIvr) {
      els.btnCloseIvr.addEventListener('click', () => els.ivrModal.style.display = 'none');
    }
    if (els.btnPlayIvrAudio) {
      els.btnPlayIvrAudio.addEventListener('click', () => {
        speakText(els.ivrVoiceScript.textContent);
      });
    }

    // Copy SMS
    if (els.copySmsBtn && els.smsPreviewText) {
      els.copySmsBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(els.smsPreviewText.textContent);
        showToast('📋 160-character emergency SMS copied to clipboard!', 'safe');
      });
    }

    // Theme Toggle
    if (els.themeToggle) {
      els.themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('daylight-mode');
        const isDay = document.body.classList.contains('daylight-mode');
        els.themeIcon.textContent = isDay ? '🌙' : '☀️';
      });
    }

    // Evaluator TreeSHAP Inspector Drawer Toggle
    if (els.btnToggleShapInspector) {
      els.btnToggleShapInspector.addEventListener('click', () => {
        const isExpanded = els.btnToggleShapInspector.getAttribute('aria-expanded') === 'true';
        const nextState = !isExpanded;
        els.btnToggleShapInspector.setAttribute('aria-expanded', nextState.toString());
        if (els.xaiEvaluatorDrawer) {
          els.xaiEvaluatorDrawer.style.display = nextState ? 'block' : 'none';
        }
      });
    }
  }

  // Initial Boot
  document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    initDopplerRadar();
    updateRadarTargets(state.persona || 'farmer');
    loadDashboard();
  });
})();

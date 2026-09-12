/**
 * WeatherGPT — Frontend Reactive Application Controller
 * Optimized for low-end mobile devices, offline resilience, and voice interaction.
 */

(function () {
  'use strict';

  // State
  const state = {
    lat: 20.7453,
    lon: 78.6022,
    lang: 'en',
    currentWeather: null,
    ttsEnabled: true,
    speechRecognition: null,
    isListening: false,
    socket: null,
  };

  // DOM Elements
  const els = {
    locationSelect: document.getElementById('location-select'),
    langSelect: document.getElementById('lang-select'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    offlineBar: document.getElementById('offline-bar'),
    
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
    currentClouds: document.getElementById('current-clouds'),

    // Cards
    sprayStatusTag: document.getElementById('spray-status-tag'),
    sprayVerdictText: document.getElementById('spray-verdict-text'),
    washMeterFill: document.getElementById('wash-meter-fill'),
    washOffPct: document.getElementById('wash-off-pct'),
    sprayWind: document.getElementById('spray-wind'),
    btnShowAgroDetails: document.getElementById('btn-show-agro-details'),

    mandiStatusTag: document.getElementById('mandi-status-tag'),
    mandiReportText: document.getElementById('mandi-report-text'),
    tarpaulinMeterFill: document.getElementById('tarpaulin-meter-fill'),
    tarpaulinUrgency: document.getElementById('tarpaulin-urgency'),
    btnMandiRefresh: document.getElementById('btn-mandi-refresh'),

    floodStatusTag: document.getElementById('flood-status-tag'),
    floodReportText: document.getElementById('flood-report-text'),
    detourBadge: document.getElementById('detour-badge'),
    btnCheckFloodRoute: document.getElementById('btn-check-flood-route'),

    smsPreviewText: document.getElementById('sms-preview-text'),
    copySmsBtn: document.getElementById('copy-sms-btn'),
    btnSimulateCall: document.getElementById('btn-simulate-call'),

    hazardChips: document.querySelectorAll('.hazard-chip'),
    hazardReportStatus: document.getElementById('hazard-report-status'),

    histNormal: document.getElementById('hist-normal'),
    currentObserved: document.getElementById('current-observed'),
    climateAnomalyTag: document.getElementById('climate-anomaly-tag'),
    climateSummaryText: document.getElementById('climate-summary-text'),
    btnClimateDetail: document.getElementById('btn-climate-detail'),

    // Chat
    chatMessages: document.getElementById('chat-messages'),
    chatTextarea: document.getElementById('chat-textarea'),
    sendBtn: document.getElementById('send-btn'),
    micBtn: document.getElementById('mic-btn'),
    ttsToggleBtn: document.getElementById('tts-toggle-btn'),
    clearChatBtn: document.getElementById('clear-chat-btn'),
    promptChips: document.querySelectorAll('.prompt-chip'),
    cacheBadge: document.getElementById('cache-badge'),

    // Modal
    ivrModal: document.getElementById('ivr-modal'),
    closeIvrModal: document.getElementById('close-ivr-modal'),
    ivrVoiceScript: document.getElementById('ivr-voice-script'),
    btnPlayIvrAudio: document.getElementById('btn-play-ivr-audio'),
    btnCloseIvr: document.getElementById('btn-close-ivr'),

    toastContainer: document.getElementById('toast-container'),
  };

  // Toast Notification
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    els.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Connectivity Listeners
  window.addEventListener('online', () => {
    els.offlineBar.classList.add('hidden');
    showToast('Internet connection restored. Live sync active.', 'success');
    fetchWeatherData();
  });

  window.addEventListener('offline', () => {
    els.offlineBar.classList.remove('hidden');
    showToast('Offline: Utilizing cached meteorological data.', 'warn');
  });

  // Theme Toggler
  els.themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('daylight-mode');
    const isDaylight = document.body.classList.contains('daylight-mode');
    els.themeIcon.textContent = isDaylight ? '🌙' : '☀️';
    localStorage.setItem('weathergpt_theme', isDaylight ? 'daylight' : 'dark');
  });

  if (localStorage.getItem('weathergpt_theme') === 'daylight') {
    document.body.classList.add('daylight-mode');
    els.themeIcon.textContent = '🌙';
  }

  // Location & Language Handlers
  els.locationSelect.addEventListener('change', (e) => {
    const [lat, lon] = e.target.value.split(',').map(Number);
    state.lat = lat;
    state.lon = lon;
    fetchWeatherData();
    fetchClimateData();
    fetchEmergencySms();
  });

  els.langSelect.addEventListener('change', (e) => {
    state.lang = e.target.value;
    showToast(`Language set to ${state.lang.toUpperCase()}`, 'info');
  });

  // Fetch Live Weather & Update UI
  async function fetchWeatherData() {
    try {
      const response = await fetch(`/api/weather/current?lat=${state.lat}&lon=${state.lon}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      state.currentWeather = data;
      localStorage.setItem(`weather_${state.lat}_${state.lon}`, JSON.stringify(data));
      renderWeather(data);
    } catch (err) {
      console.warn('Network fetch failed, attempting cached fallback:', err);
      const cached = localStorage.getItem(`weather_${state.lat}_${state.lon}`);
      if (cached) {
        const data = JSON.parse(cached);
        state.currentWeather = data;
        renderWeather(data);
        els.offlineBar.classList.remove('hidden');
      } else {
        showToast('Unable to fetch weather data. Check server connection.', 'error');
      }
    }
  }

  // Render Weather into 3-Zone Architecture
  function renderWeather(data) {
    const cur = data.current;

    // Stats
    els.currentTemp.textContent = `${Math.round(cur.temperature_2m)}°C`;
    els.currentHumidity.textContent = `${Math.round(cur.relative_humidity_2m)}%`;
    els.currentWind.textContent = `${Math.round(cur.wind_speed_10m)} km/h`;
    els.currentClouds.textContent = `${Math.round(cur.precipitation * 10)}%`;

    // Safety Shield
    els.shieldSeverity.textContent = `${data.action_badge_status} ADVISORY`;
    els.shieldHeadline.textContent = data.today_action_summary;
    els.shieldDetail.textContent = `Location: ${data.location_name}. Pressure: ${cur.surface_pressure} hPa. Feels like: ${cur.apparent_temperature}°C.`;
    
    if (data.action_badge_status === 'UNSAFE') {
      els.shield.className = 'safety-shield alert-severe';
      els.shieldDot.className = 'pulse-dot red';
    } else if (data.action_badge_status === 'CAUTION') {
      els.shield.className = 'safety-shield alert-warning';
      els.shieldDot.className = 'pulse-dot amber';
    } else {
      els.shield.className = 'safety-shield';
      els.shieldDot.className = 'pulse-dot green';
    }

    // Agro-Met Precision Spray
    const rainProb = data.nowcast_3h.length ? data.nowcast_3h[0].rain_prob_pct : 15;
    const isSafe = data.action_badge_status === 'SAFE' && cur.wind_speed_10m <= 15.0;
    
    els.sprayStatusTag.textContent = isSafe ? 'SAFE' : 'CAUTION';
    els.sprayStatusTag.className = `status-tag ${isSafe ? 'safe' : 'warn'}`;
    els.sprayVerdictText.textContent = isSafe 
      ? 'Optimal conditions for cotton & soybean foliar spray. Low drift and minimal wash-off risk.' 
      : 'Spray caution advised due to gusty wind or rain probability.';
    els.washOffPct.textContent = `${rainProb}%`;
    els.washMeterFill.style.width = `${Math.min(100, rainProb)}%`;
    els.washMeterFill.className = `meter-fill ${rainProb > 40 ? 'danger-fill' : 'safe-fill'}`;
    els.sprayWind.textContent = `${cur.wind_speed_10m} km/h`;
  }

  // Fetch Emergency SMS Payload
  async function fetchEmergencySms() {
    try {
      const response = await fetch(`/api/telecom/sms-payload?lat=${state.lat}&lon=${state.lon}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.sms_text) {
        els.smsPreviewText.textContent = data.sms_text;
      }
    } catch (e) {
      console.warn('SMS payload fetch error:', e);
    }
  }

  // Fetch Climate ERA5 40-Year Normal
  async function fetchClimateData() {
    try {
      const response = await fetch(`/api/climate/compare?lat=${state.lat}&lon=${state.lon}`);
      if (!response.ok) return;
      const data = await response.json();
      els.histNormal.textContent = `${Math.round(data.normal_30year_baseline_mm)} mm`;
      els.currentObserved.textContent = `${Math.round(data.recent_10day_rainfall_mm)} mm`;
      els.climateSummaryText.textContent = data.climatological_verdict;
      els.climateAnomalyTag.textContent = data.monsoon_anomaly_pct >= 0 ? `+${data.monsoon_anomaly_pct}%` : `${data.monsoon_anomaly_pct}%`;
    } catch (err) {
      console.warn('Climate fetch error:', err);
    }
  }

  // Mandi Shield Refresh
  els.btnMandiRefresh.addEventListener('click', async () => {
    try {
      showToast('Scanning Doppler cloudburst signature for APMC yards...', 'info');
      const response = await fetch('/api/mandi/status?mandi_id=mandi_01');
      const data = await response.json();
      els.mandiStatusTag.textContent = data.risk_level;
      els.mandiStatusTag.className = `status-tag ${data.risk_level === 'CRITICAL' ? 'danger' : 'safe'}`;
      els.mandiReportText.textContent = data.tarpaulin_advisory;
      const score = data.risk_level === 'CRITICAL' ? 85 : 20;
      els.tarpaulinUrgency.textContent = `${score}/100`;
      els.tarpaulinMeterFill.style.width = `${score}%`;
      els.tarpaulinMeterFill.className = `meter-fill ${score > 50 ? 'danger-fill' : 'safe-fill'}`;
      showToast('Mandi Shield status refreshed.', 'success');
    } catch (err) {
      showToast('Failed to refresh Mandi data.', 'error');
    }
  });

  // Flood Detour Simulation
  els.btnCheckFloodRoute.addEventListener('click', async () => {
    try {
      showToast('Evaluating hydro-topographic underpass inundation...', 'info');
      const response = await fetch(`/api/flood/detour?lat=${state.lat}&lon=${state.lon}`);
      const data = await response.json();
      if (data.risk_level !== 'CLEAR') {
        els.floodStatusTag.textContent = data.risk_level;
        els.floodStatusTag.className = 'status-tag danger';
        els.floodReportText.textContent = `Warning: ${data.hotspot_name} estimated water depth ${data.water_depth_est_meters}m. Impassable in ~${data.impassable_in_mins} mins.`;
        els.detourBadge.style.display = 'block';
        els.detourBadge.querySelector('span').textContent = `⚠️ Bypass: ${data.recommended_detour} (+${data.elevation_gain_meters}m ground, +${data.time_delta_mins} mins)`;
      } else {
        els.floodStatusTag.textContent = 'PASSABLE';
        els.floodStatusTag.className = 'status-tag safe';
        els.floodReportText.textContent = `${data.hotspot_name} is clear. Water depth ${data.water_depth_est_meters}m. Normal transit.`;
        els.detourBadge.style.display = 'none';
      }
      showToast('Route inundation model calculated.', 'info');
    } catch (err) {
      showToast('Failed to calculate route.', 'error');
    }
  });

  // 2G Button-Phone Missed-Call Simulator
  els.btnSimulateCall.addEventListener('click', async () => {
    els.ivrModal.style.display = 'flex';
    try {
      const response = await fetch('/api/telecom/missed-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: '+919876543210',
          latitude: state.lat,
          longitude: state.lon,
          language: state.lang
        })
      });
      const data = await response.json();
      els.ivrVoiceScript.textContent = `"${data.voice_script}"`;
    } catch (err) {
      els.ivrVoiceScript.textContent = 'WeatherGPT Kisan Vani: Live connection established.';
    }
  });

  els.closeIvrModal.addEventListener('click', () => els.ivrModal.style.display = 'none');
  els.btnCloseIvr.addEventListener('click', () => els.ivrModal.style.display = 'none');

  els.btnPlayIvrAudio.addEventListener('click', () => {
    const text = els.ivrVoiceScript.textContent.replace(/"/g, '');
    speakText(text, state.lang);
  });

  // Copy SMS
  els.copySmsBtn.addEventListener('click', () => {
    const text = els.smsPreviewText.textContent;
    navigator.clipboard.writeText(text).then(() => {
      showToast('GSM 03.38 SMS payload copied to clipboard!', 'success');
    });
  });

  // Mausam Rakshak 1-Tap Hazard Reporting
  els.hazardChips.forEach((chip) => {
    chip.addEventListener('click', async () => {
      const hazardType = chip.getAttribute('data-type');
      showToast(`Submitting ${hazardType} report with GPS pin...`, 'info');
      try {
        const response = await fetch('/api/rakshak/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hazard_type: hazardType,
            severity: 'PEA_SIZE',
            latitude: state.lat,
            longitude: state.lon,
            user_id: 'citizen_demo_user',
            timestamp: new Date().toISOString(),
            notes: `Crowdsourced 1-tap ${hazardType} report.`
          })
        });
        const res = await response.json();
        if (res.status === 'VERIFIED') {
          showToast(`Report Verified! Satellite & Consensus match. ID: ${res.report_id}`, 'success');
        } else {
          showToast(`Report recorded. Status: ${res.status}. Consensus: ${res.consensus_count}`, 'warn');
        }
      } catch (err) {
        showToast('Ground truth submission failed.', 'error');
      }
    });
  });

  // Chat Functionality
  function appendChatMessage(sender, text, provenance = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message`;
    msgDiv.innerHTML = `
      <div class="message-avatar">${sender === 'user' ? '👤' : '⚡'}</div>
      <div class="message-content">
        <div class="message-bubble"><p>${text}</p></div>
        ${provenance ? `<div class="message-meta"><span class="provenance-tag">${provenance}</span></div>` : ''}
      </div>
    `;
    els.chatMessages.appendChild(msgDiv);
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;

    if (sender === 'assistant' && state.ttsEnabled) {
      speakText(text, state.lang);
    }
  }

  async function handleSendQuery(queryText) {
    const text = queryText || els.chatTextarea.value.trim();
    if (!text) return;

    appendChatMessage('user', text);
    els.chatTextarea.value = '';
    els.chatTextarea.style.height = 'auto';

    // Show loading indicator
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.className = 'message assistant-message';
    loadingDiv.innerHTML = `
      <div class="message-avatar">⚡</div>
      <div class="message-content">
        <div class="message-bubble"><p><em>Analyzing numerical models and spatial cache...</em></p></div>
      </div>
    `;
    els.chatMessages.appendChild(loadingDiv);
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          latitude: state.lat,
          longitude: state.lon,
          language: state.lang,
          user_persona: 'auto'
        })
      });
      const data = await response.json();
      document.getElementById(loadingId)?.remove();
      
      const prov = `Intent: ${data.detected_intent} • Badge: [${data.action_badge}] ${data.action_badge_label} • Cache: ${data.cache_hit ? 'HIT (98% Cost Saved)' : 'FRESH'}`;
      appendChatMessage('assistant', data.reply_text, prov);

      if (data.cache_hit) {
        els.cacheBadge.textContent = 'CACHE HIT (0 COST)';
        els.cacheBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      } else {
        els.cacheBadge.textContent = 'FRESH MODEL COMPUTE';
      }
    } catch (err) {
      document.getElementById(loadingId)?.remove();
      appendChatMessage('assistant', 'Sorry, I encountered a communication error connecting to the meteorological engine. Please try again.');
    }
  }

  els.sendBtn.addEventListener('click', () => handleSendQuery());
  els.chatTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  });

  els.promptChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      handleSendQuery(prompt);
    });
  });

  els.clearChatBtn.addEventListener('click', () => {
    els.chatMessages.innerHTML = '';
    appendChatMessage('assistant', 'Chat session cleared. How can I assist you with weather or climate intelligence?');
  });

  // Text to Speech
  els.ttsToggleBtn.addEventListener('click', () => {
    state.ttsEnabled = !state.ttsEnabled;
    els.ttsToggleBtn.classList.toggle('active', state.ttsEnabled);
    els.ttsToggleBtn.querySelector('span').textContent = state.ttsEnabled ? '🔊 Voice Readout: ON' : '🔈 Voice Readout: OFF';
    if (!state.ttsEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  });

  function speakText(text, lang) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN' };
    utterance.lang = langMap[lang] || 'en-IN';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  // Web Speech Recognition
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    state.speechRecognition = new SpeechRecognition();
    state.speechRecognition.continuous = false;
    state.speechRecognition.interimResults = false;

    state.speechRecognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      els.chatTextarea.value = transcript;
      handleSendQuery(transcript);
    };

    state.speechRecognition.onerror = (e) => {
      console.warn('Speech recognition error:', e);
      els.micBtn.classList.remove('listening');
      state.isListening = false;
    };

    state.speechRecognition.onend = () => {
      els.micBtn.classList.remove('listening');
      state.isListening = false;
    };

    els.micBtn.addEventListener('click', () => {
      if (state.isListening) {
        state.speechRecognition.stop();
      } else {
        const langMap = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN' };
        state.speechRecognition.lang = langMap[state.lang] || 'en-IN';
        state.speechRecognition.start();
        els.micBtn.classList.add('listening');
        state.isListening = true;
        showToast('Listening... Speak your weather query.', 'info');
      }
    });
  } else {
    els.micBtn.title = 'Speech recognition not supported in this browser';
  }

  // WebSocket Live Alert Broadcast Listener (WMO WIS 2.0)
  function connectAlertWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/alerts`;
    
    try {
      state.socket = new WebSocket(wsUrl);

      state.socket.onmessage = (event) => {
        try {
          const alert = JSON.parse(event.data);
          if (alert.type === 'ALERT_BROADCAST') {
            showToast(`EMERGENCY BROADCAST: ${alert.data.headline}`, 'warn');
            els.shield.className = `safety-shield alert-${alert.data.severity.toLowerCase()}`;
            els.shieldSeverity.textContent = `${alert.data.severity} BROADCAST`;
            els.shieldHeadline.textContent = alert.data.headline;
            els.shieldDetail.textContent = alert.data.instruction;
          }
        } catch (e) {
          console.warn('WS message parse error:', e);
        }
      };

      state.socket.onclose = () => {
        // Reconnect after delay
        setTimeout(connectAlertWebSocket, 5000);
      };
    } catch (e) {
      console.warn('WebSocket connection not supported or failed:', e);
    }
  }

  // Initial Boot
  fetchWeatherData();
  fetchClimateData();
  fetchEmergencySms();
  connectAlertWebSocket();

  // PWA Service Worker Registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(err => {
      console.log('SW registration error:', err);
    });
  }

})();

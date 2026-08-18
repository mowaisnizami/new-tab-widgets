(() => {
  'use strict';

  const STORAGE_KEY = 'clockDashboardConfig';
  const TIMEZONES = [
    'Pacific/Midway', 'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles',
    'America/Denver', 'America/Chicago', 'America/New_York', 'America/Toronto',
    'America/Halifax', 'America/St_Johns', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires',
    'Atlantic/South_Georgia', 'Atlantic/Azores', 'Europe/London', 'Europe/Dublin',
    'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
    'Europe/Amsterdam', 'Europe/Warsaw', 'Europe/Bucharest', 'Europe/Athens',
    'Europe/Istanbul', 'Europe/Moscow', 'Asia/Dubai', 'Asia/Karachi',
    'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Singapore',
    'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Asia/Seoul',
    'Australia/Perth', 'Australia/Adelaide', 'Australia/Sydney', 'Australia/Auckland',
    'Pacific/Fiji', 'Pacific/Tongatapu'
  ];

  let config = {
    timeFormat: '24',
    showSeconds: true,
    showDate: true,
    regionalClocks: []
  };

  let clockInterval = null;
  let deleteTargetId = null;

  // DOM references
  const els = {
    primaryTime: document.getElementById('primaryTime'),
    primaryDate: document.getElementById('primaryDate'),
    regionalContainer: document.getElementById('regionalClocks'),
    settingsBtn: document.getElementById('settingsBtn'),
    addClockBtn: document.getElementById('addClockBtn'),
    clockLabel: document.getElementById('clockLabel'),
    clockTimezone: document.getElementById('clockTimezone'),
    saveClockBtn: document.getElementById('saveClockBtn'),
    format24: document.getElementById('format24'),
    format12: document.getElementById('format12'),
    showSeconds: document.getElementById('showSeconds'),
    showDate: document.getElementById('showDate'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    resetBtn: document.getElementById('resetBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  };

  const addClockModal = new bootstrap.Modal(document.getElementById('addClockModal'));
  const settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

  // ── Config persistence ──

  function saveConfig() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: config });
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  }

  function loadConfig(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        if (result[STORAGE_KEY]) {
          config = { ...config, ...result[STORAGE_KEY] };
        }
        callback();
      });
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        config = { ...config, ...JSON.parse(stored) };
      }
      callback();
    }
  }

  // ── Timezone list ──

  function populateTimezones() {
    const select = els.clockTimezone;
    TIMEZONES.forEach(tz => {
      const offset = getTimezoneOffset(tz);
      const label = tz.replace(/_/g, ' ').replace('/', ' / ');
      const opt = document.createElement('option');
      opt.value = tz;
      opt.textContent = `${label}  (${offset})`;
      select.appendChild(opt);
    });
  }

  function getTimezoneOffset(tz) {
    try {
      const now = new Date();
      const str = now.toLocaleString('en-US', { timeZone: tz, timeZoneName: 'shortOffset' });
      const match = str.match(/GMT([+-]\d{1,2}(?::\d{2})?)/);
      return match ? 'UTC' + match[1] : '';
    } catch {
      return '';
    }
  }

  // ── Clock formatting ──

  function formatTime(date, tz) {
    const options = { timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone };
    options.hour = '2-digit';
    options.minute = '2-digit';
    if (config.showSeconds) options.second = '2-digit';
    if (config.timeFormat === '12') {
      options.hour12 = true;
    } else {
      options.hour12 = false;
    }
    return date.toLocaleTimeString('en-GB', options);
  }

  function formatDate(date, tz) {
    const options = {
      timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  }

  // ── Rendering ──

  function updateClocks() {
    const now = new Date();

    els.primaryTime.textContent = formatTime(now);
    els.primaryDate.textContent = formatDate(now);

    els.primaryDate.style.display = config.showDate ? '' : 'none';

    // Regional clocks
    config.regionalClocks.forEach(clock => {
      const timeEl = document.querySelector(`[data-clock-id="${clock.id}"] .regional-clock-time`);
      const dateEl = document.querySelector(`[data-clock-id="${clock.id}"] .regional-clock-date`);
      if (timeEl) timeEl.textContent = formatTime(now, clock.timezone);
      if (dateEl) {
        dateEl.textContent = formatDate(now, clock.timezone);
        dateEl.style.display = config.showDate ? '' : 'none';
      }
    });
  }

  function renderRegionalClocks() {
    const container = els.regionalContainer;
    container.innerHTML = '';

    config.regionalClocks.forEach(clock => {
      const card = document.createElement('div');
      card.className = 'regional-clock-card';
      card.setAttribute('data-clock-id', clock.id);
      card.innerHTML = `
        <button class="regional-clock-delete" data-delete-id="${clock.id}" title="Remove">
          <i class="bi bi-x-lg"></i>
        </button>
        <div class="regional-clock-label">${escapeHtml(clock.label)}</div>
        <div class="regional-clock-time">--:--:--</div>
        <div class="regional-clock-date" style="${config.showDate ? '' : 'display:none'}">--</div>
      `;
      container.appendChild(card);
    });

    updateClocks();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── UI sync ──

  function syncSettingsUI() {
    els.format24.checked = config.timeFormat === '24';
    els.format12.checked = config.timeFormat === '12';
    els.showSeconds.checked = config.showSeconds;
    els.showDate.checked = config.showDate;
  }

  // ── Event handlers ──

  function setupEvents() {
    els.settingsBtn.addEventListener('click', () => {
      syncSettingsUI();
      settingsModal.show();
    });

    els.addClockBtn.addEventListener('click', () => {
      els.clockLabel.value = '';
      els.clockTimezone.selectedIndex = 0;
      addClockModal.show();
    });

    els.saveClockBtn.addEventListener('click', () => {
      const label = els.clockLabel.value.trim();
      const timezone = els.clockTimezone.value;

      if (!label) {
        els.clockLabel.classList.add('is-invalid');
        return;
      }
      els.clockLabel.classList.remove('is-invalid');

      if (!timezone) {
        els.clockTimezone.classList.add('is-invalid');
        return;
      }
      els.clockTimezone.classList.remove('is-invalid');

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      config.regionalClocks.push({ id, label, timezone });
      saveConfig();
      renderRegionalClocks();
      addClockModal.hide();
    });

    els.regionalContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-delete-id]');
      if (btn) {
        deleteTargetId = btn.getAttribute('data-delete-id');
        deleteModal.show();
      }
    });

    els.confirmDeleteBtn.addEventListener('click', () => {
      if (deleteTargetId) {
        config.regionalClocks = config.regionalClocks.filter(c => c.id !== deleteTargetId);
        saveConfig();
        renderRegionalClocks();
        deleteTargetId = null;
      }
      deleteModal.hide();
    });

    els.format24.addEventListener('change', () => {
      config.timeFormat = '24';
      saveConfig();
      updateClocks();
    });

    els.format12.addEventListener('change', () => {
      config.timeFormat = '12';
      saveConfig();
      updateClocks();
    });

    els.showSeconds.addEventListener('change', () => {
      config.showSeconds = els.showSeconds.checked;
      saveConfig();
      updateClocks();
    });

    els.showDate.addEventListener('change', () => {
      config.showDate = els.showDate.checked;
      saveConfig();
      renderRegionalClocks();
    });

    els.exportBtn.addEventListener('click', exportConfig);
    els.importBtn.addEventListener('click', () => els.importFile.click());
    els.importFile.addEventListener('change', importConfig);
    els.resetBtn.addEventListener('click', resetAll);
  }

  // ── Export / Import / Reset ──

  function exportConfig() {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clock-dashboard-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importConfig(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (typeof imported.timeFormat !== 'string' || !Array.isArray(imported.regionalClocks)) {
          throw new Error('Invalid config format');
        }
        config = {
          timeFormat: imported.timeFormat || '24',
          showSeconds: imported.showSeconds !== undefined ? imported.showSeconds : true,
          showDate: imported.showDate !== undefined ? imported.showDate : true,
          regionalClocks: imported.regionalClocks || []
        };
        saveConfig();
        syncSettingsUI();
        renderRegionalClocks();
        settingsModal.hide();
      } catch (err) {
        alert('Invalid configuration file. Please check the format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function resetAll() {
    if (!confirm('This will remove all regional clocks and reset settings. Continue?')) return;
    config = {
      timeFormat: '24',
      showSeconds: true,
      showDate: true,
      regionalClocks: []
    };
    saveConfig();
    syncSettingsUI();
    renderRegionalClocks();
    settingsModal.hide();
  }

  // ── Init ──

  function init() {
    populateTimezones();
    setupEvents();

    loadConfig(() => {
      syncSettingsUI();
      renderRegionalClocks();
      updateClocks();
      clockInterval = setInterval(updateClocks, 1000);
    });
  }

  init();
})();

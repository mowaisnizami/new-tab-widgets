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
    regionalClocks: [],
    sections: []
  };

  let clockInterval = null;
  let deleteTargetId = null;
  let deleteSectionTargetId = null;
  let deleteAppTargetId = null;
  let addAppTargetSectionId = null;

  // DOM references
  const els = {
    primaryTime: document.getElementById('primaryTime'),
    primaryDate: document.getElementById('primaryDate'),
    regionalContainer: document.getElementById('regionalClocks'),
    sectionsContainer: document.getElementById('sectionsContainer'),
    settingsBtn: document.getElementById('settingsBtn'),
    addClockBtn: document.getElementById('addClockBtn'),
    addSectionBtn: document.getElementById('addSectionBtn'),
    clockLabel: document.getElementById('clockLabel'),
    clockTimezone: document.getElementById('clockTimezone'),
    saveClockBtn: document.getElementById('saveClockBtn'),
    sectionName: document.getElementById('sectionName'),
    saveSectionBtn: document.getElementById('saveSectionBtn'),
    appName: document.getElementById('appName'),
    appUrl: document.getElementById('appUrl'),
    saveAppBtn: document.getElementById('saveAppBtn'),
    format24: document.getElementById('format24'),
    format12: document.getElementById('format12'),
    showSeconds: document.getElementById('showSeconds'),
    showDate: document.getElementById('showDate'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    resetBtn: document.getElementById('resetBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    confirmDeleteSectionBtn: document.getElementById('confirmDeleteSectionBtn'),
    confirmDeleteAppBtn: document.getElementById('confirmDeleteAppBtn'),
  };

  const addClockModal = new bootstrap.Modal(document.getElementById('addClockModal'));
  const settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
  const addSectionModal = new bootstrap.Modal(document.getElementById('addSectionModal'));
  const addAppModal = new bootstrap.Modal(document.getElementById('addAppModal'));
  const deleteSectionModal = new bootstrap.Modal(document.getElementById('deleteSectionModal'));
  const deleteAppModal = new bootstrap.Modal(document.getElementById('deleteAppModal'));

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

  // ── Sections & Apps ──

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function getFaviconUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?url=${domain}&sz=32`;
    } catch {
      return '';
    }
  }

  function renderSections() {
    const container = els.sectionsContainer;
    container.innerHTML = '';

    config.sections.forEach(section => {
      const wrapper = document.createElement('div');
      wrapper.className = 'section-wrapper';
      wrapper.setAttribute('data-section-id', section.id);
      wrapper.setAttribute('draggable', 'false');

      const handle = document.createElement('div');
      handle.className = 'section-drag-handle';
      handle.innerHTML = '<i class="bi bi-grip-vertical"></i>';
      handle.setAttribute('draggable', 'true');
      handle.addEventListener('dragstart', (e) => {
        wrapper.setAttribute('draggable', 'true');
        wrapper.classList.add('dragging');
        e.dataTransfer.setData('text/plain', section.id);
        e.dataTransfer.setData('application/x-section-drag', 'true');
        e.dataTransfer.effectAllowed = 'move';
      });
      handle.addEventListener('dragend', () => {
        wrapper.setAttribute('draggable', 'false');
        wrapper.classList.remove('dragging');
        container.querySelectorAll('.section-wrapper').forEach(el => el.classList.remove('drag-over'));
      });

      const body = document.createElement('div');
      body.className = 'section-body';

      const header = document.createElement('div');
      header.className = 'section-header';
      header.innerHTML = `
        <span class="section-title">${escapeHtml(section.name)}</span>
        <button class="section-delete-btn" data-delete-section="${section.id}" title="Remove section">
          <i class="bi bi-x-lg"></i>
        </button>
      `;

      const grid = document.createElement('div');
      grid.className = 'section-apps-grid';
      grid.setAttribute('data-section-id', section.id);

      section.apps.forEach(app => {
        const card = document.createElement('a');
        card.className = 'app-card';
        card.href = app.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.setAttribute('data-app-id', app.id);
        card.setAttribute('draggable', 'true');

        const favicon = getFaviconUrl(app.url);
        card.innerHTML = `
          <button class="app-card-delete" data-delete-app="${app.id}" data-section-id="${section.id}" title="Remove">
            <i class="bi bi-x-lg"></i>
          </button>
          ${favicon ? `<img class="app-card-favicon" src="${favicon}" alt="" onerror="this.style.display='none'">` : ''}
          <span class="app-card-name">${escapeHtml(app.name)}</span>
        `;

        card.addEventListener('dragstart', (e) => {
          e.stopPropagation();
          card.classList.add('dragging');
          e.dataTransfer.setData('text/plain', app.id);
          e.dataTransfer.setData('application/x-app-drag', 'true');
          e.dataTransfer.setData('application/x-source-section', section.id);
          e.dataTransfer.effectAllowed = 'move';
        });

        card.addEventListener('dragend', (e) => {
          e.stopPropagation();
          card.classList.remove('dragging');
          container.querySelectorAll('.app-card').forEach(el => el.classList.remove('drag-over'));
        });

        card.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer.types.includes('application/x-app-drag')) {
            card.classList.add('drag-over');
          }
        });

        card.addEventListener('dragleave', (e) => {
          e.stopPropagation();
          card.classList.remove('drag-over');
        });

        card.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          card.classList.remove('drag-over');
          if (!e.dataTransfer.types.includes('application/x-app-drag')) return;

          const draggedAppId = e.dataTransfer.getData('text/plain');
          const sourceSectionId = e.dataTransfer.getData('application/x-source-section');
          const targetAppId = app.id;
          const targetSectionId = section.id;

          if (draggedAppId === targetAppId) return;

          const sourceSection = config.sections.find(s => s.id === sourceSectionId);
          const targetSection = config.sections.find(s => s.id === targetSectionId);
          if (!sourceSection || !targetSection) return;

          const draggedIdx = sourceSection.apps.findIndex(a => a.id === draggedAppId);
          if (draggedIdx === -1) return;
          const [draggedApp] = sourceSection.apps.splice(draggedIdx, 1);

          const targetIdx = targetSection.apps.findIndex(a => a.id === targetAppId);
          targetSection.apps.splice(targetIdx, 0, draggedApp);

          saveConfig();
          renderSections();
        });

        grid.appendChild(card);
      });

      const addBtn = document.createElement('button');
      addBtn.className = 'app-card-add';
      addBtn.innerHTML = '<i class="bi bi-plus-lg"></i><span>Add App</span>';
      addBtn.addEventListener('click', () => {
        addAppTargetSectionId = section.id;
        els.appName.value = '';
        els.appUrl.value = '';
        addAppModal.show();
      });
      grid.appendChild(addBtn);

      // Section-level drag-and-drop
      wrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('application/x-section-drag')) {
          wrapper.classList.add('drag-over');
        }
      });

      wrapper.addEventListener('dragleave', (e) => {
        if (!wrapper.contains(e.relatedTarget)) {
          wrapper.classList.remove('drag-over');
        }
      });

      wrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        wrapper.classList.remove('drag-over');
        if (!e.dataTransfer.types.includes('application/x-section-drag')) return;

        const draggedSectionId = e.dataTransfer.getData('text/plain');
        const targetSectionId = section.id;
        if (draggedSectionId === targetSectionId) return;

        const draggedIdx = config.sections.findIndex(s => s.id === draggedSectionId);
        const targetIdx = config.sections.findIndex(s => s.id === targetSectionId);
        if (draggedIdx === -1 || targetIdx === -1) return;

        const [draggedSection] = config.sections.splice(draggedIdx, 1);
        config.sections.splice(targetIdx, 0, draggedSection);

        saveConfig();
        renderSections();
      });

      body.appendChild(header);
      body.appendChild(grid);
      wrapper.appendChild(handle);
      wrapper.appendChild(body);
      container.appendChild(wrapper);
    });
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

    // ── Section events ──

    els.addSectionBtn.addEventListener('click', () => {
      els.sectionName.value = '';
      addSectionModal.show();
    });

    els.saveSectionBtn.addEventListener('click', () => {
      const name = els.sectionName.value.trim();
      if (!name) {
        els.sectionName.classList.add('is-invalid');
        return;
      }
      els.sectionName.classList.remove('is-invalid');

      config.sections.push({ id: generateId(), name, apps: [] });
      saveConfig();
      renderSections();
      addSectionModal.hide();
    });

    els.sectionsContainer.addEventListener('click', (e) => {
      const sectionDeleteBtn = e.target.closest('[data-delete-section]');
      if (sectionDeleteBtn) {
        deleteSectionTargetId = sectionDeleteBtn.getAttribute('data-delete-section');
        deleteSectionModal.show();
        return;
      }

      const appDeleteBtn = e.target.closest('[data-delete-app]');
      if (appDeleteBtn) {
        e.preventDefault();
        e.stopPropagation();
        deleteAppTargetId = appDeleteBtn.getAttribute('data-delete-app');
        deleteAppTargetSectionId = appDeleteBtn.getAttribute('data-section-id');
        deleteAppModal.show();
        return;
      }
    });

    els.confirmDeleteSectionBtn.addEventListener('click', () => {
      if (deleteSectionTargetId) {
        config.sections = config.sections.filter(s => s.id !== deleteSectionTargetId);
        saveConfig();
        renderSections();
        deleteSectionTargetId = null;
      }
      deleteSectionModal.hide();
    });

    els.confirmDeleteAppBtn.addEventListener('click', () => {
      if (deleteAppTargetId && deleteAppTargetSectionId) {
        const section = config.sections.find(s => s.id === deleteAppTargetSectionId);
        if (section) {
          section.apps = section.apps.filter(a => a.id !== deleteAppTargetId);
          saveConfig();
          renderSections();
        }
        deleteAppTargetId = null;
        deleteAppTargetSectionId = null;
      }
      deleteAppModal.hide();
    });

    // ── Add App events ──

    els.saveAppBtn.addEventListener('click', () => {
      const name = els.appName.value.trim();
      const url = els.appUrl.value.trim();

      if (!name) {
        els.appName.classList.add('is-invalid');
        return;
      }
      els.appName.classList.remove('is-invalid');

      if (!url) {
        els.appUrl.classList.add('is-invalid');
        return;
      }
      els.appUrl.classList.remove('is-invalid');

      // Ensure URL has protocol
      const finalUrl = url.match(/^https?:\/\//) ? url : 'https://' + url;

      const section = config.sections.find(s => s.id === addAppTargetSectionId);
      if (section) {
        section.apps.push({ id: generateId(), name, url: finalUrl });
        saveConfig();
        renderSections();
      }
      addAppTargetSectionId = null;
      addAppModal.hide();
    });

    // ── Settings events ──

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
          regionalClocks: imported.regionalClocks || [],
          sections: imported.sections || []
        };
        saveConfig();
        syncSettingsUI();
        renderRegionalClocks();
        renderSections();
        settingsModal.hide();
      } catch (err) {
        alert('Invalid configuration file. Please check the format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function resetAll() {
    if (!confirm('This will remove all regional clocks, sections, and reset settings. Continue?')) return;
    config = {
      timeFormat: '24',
      showSeconds: true,
      showDate: true,
      regionalClocks: [],
      sections: []
    };
    saveConfig();
    syncSettingsUI();
    renderRegionalClocks();
    renderSections();
    settingsModal.hide();
  }

  // ── Init ──

  function init() {
    populateTimezones();
    setupEvents();

    loadConfig(() => {
      syncSettingsUI();
      renderRegionalClocks();
      renderSections();
      updateClocks();
      clockInterval = setInterval(updateClocks, 1000);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

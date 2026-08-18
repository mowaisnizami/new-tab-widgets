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
    sections: [],
    customIcons: []
  };

  let clockInterval = null;
  let deleteTargetId = null;
  let deleteSectionTargetId = null;
  let deleteAppTargetId = null;
  let addAppTargetSectionId = null;
  let editAppTargetId = null;
  let editAppTargetSectionId = null;

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
    subLinksContainer: document.getElementById('subLinksContainer'),
    addSubLinkBtn: document.getElementById('addSubLinkBtn'),
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
    customIconInput: document.getElementById('customIconInput'),
    addCustomIconBtn: document.getElementById('addCustomIconBtn'),
    customIconsList: document.getElementById('customIconsList'),
    appIconPickerBtn: document.getElementById('appIconPickerBtn'),
    appIconPreview: document.getElementById('appIconPreview'),
    appIconLabel: document.getElementById('appIconLabel'),
    appIconValue: document.getElementById('appIconValue'),
    clearAppIconBtn: document.getElementById('clearAppIconBtn'),
  };

  const addClockModal = new bootstrap.Modal(document.getElementById('addClockModal'));
  const settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
  const addSectionModal = new bootstrap.Modal(document.getElementById('addSectionModal'));
  const addAppModal = new bootstrap.Modal(document.getElementById('addAppModal'));
  const deleteSectionModal = new bootstrap.Modal(document.getElementById('deleteSectionModal'));
  const deleteAppModal = new bootstrap.Modal(document.getElementById('deleteAppModal'));

  document.getElementById('addAppModal').addEventListener('hidden.bs.modal', () => {
    closeIconPicker();
  });

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
      const hostname = new URL(url).hostname;
      // Skip private/local IPs — external services can't reach them
      if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|localhost|::1|100\.64\.|100\.\d{1,2}\.)/.test(hostname)) {
        return '';
      }
      return `https://icon.horse/icon/${hostname}`;
    } catch {
      return '';
    }
  }

  const SECTION_COLORS = ['blue', 'purple', 'green', 'orange', 'pink', 'cyan'];

  function renderSections() {
    const container = els.sectionsContainer;
    container.innerHTML = '';

    config.sections.forEach((section, index) => {
      const color = SECTION_COLORS[index % SECTION_COLORS.length];
      const wrapper = document.createElement('div');
      wrapper.className = 'section-wrapper';
      wrapper.setAttribute('data-section-id', section.id);
      wrapper.setAttribute('data-color', color);
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
      const titleEl = document.createElement('span');
      titleEl.className = 'section-title';
      titleEl.textContent = section.name;
      titleEl.title = 'Click to rename';
      titleEl.style.cursor = 'pointer';
      titleEl.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'section-title-input';
        input.value = section.name;
        titleEl.replaceWith(input);
        input.focus();
        input.select();
        const save = () => {
          const newName = input.value.trim();
          if (newName && newName !== section.name) {
            section.name = newName;
            saveConfig();
          }
          renderSections();
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); save(); }
          if (e.key === 'Escape') { renderSections(); }
        });
      });
      header.appendChild(titleEl);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'section-delete-btn';
      deleteBtn.setAttribute('data-delete-section', section.id);
      deleteBtn.title = 'Remove section';
      deleteBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
      header.appendChild(deleteBtn);

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
        const fallbackInitial = app.name.charAt(0).toUpperCase();
        const appIconClass = app.appIcon || '';
        const subLinks = app.subLinks || [];
        const subLinksHtml = subLinks.length > 0 ? `
          <div class="app-card-sublinks">
            ${subLinks.map(sl => {
              const iconClass = sl.icon || 'bi-globe';
              return `<a class="app-card-sublink" href="${escapeHtml(sl.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(sl.name)}" onclick="event.stopPropagation()">
                <i class="bi ${escapeHtml(iconClass)} app-card-sublink-icon"></i>
              </a>`;
            }).join('')}
          </div>
        ` : '';
        const mainIconHtml = appIconClass
          ? `<div class="app-card-favicon-fallback"><i class="bi ${escapeHtml(appIconClass)}" style="font-size:1.2rem;"></i></div>`
          : favicon
            ? `<img class="app-card-favicon" src="${favicon}" alt="" onerror="this.outerHTML='<div class=\\'app-card-favicon-fallback\\'>${escapeHtml(fallbackInitial)}</div>'">`
            : `<div class="app-card-favicon-fallback">${escapeHtml(fallbackInitial)}</div>`;
        card.innerHTML = `
          <div class="app-card-actions">
            <button class="app-card-edit" data-edit-app="${app.id}" data-section-id="${section.id}" title="Edit">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="app-card-delete" data-delete-app="${app.id}" data-section-id="${section.id}" title="Remove">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          ${mainIconHtml}
          <span class="app-card-name">${escapeHtml(app.name)}</span>
          ${subLinksHtml}
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
        editAppTargetId = null;
        editAppTargetSectionId = null;
        els.appName.value = '';
        els.appUrl.value = '';
        modalSubLinks = [];
        modalAppIcon = '';
        els.appIconPreview.className = 'bi bi-globe';
        els.appIconLabel.textContent = 'Auto (from URL)';
        els.appIconValue.value = '';
        els.clearAppIconBtn.style.display = 'none';
        renderSubLinksInModal();

        const modalTitle = document.querySelector('#addAppModal .modal-title');
        const modalBtn = document.getElementById('saveAppBtn');
        modalTitle.innerHTML = '<i class="bi bi-plus-square me-2"></i>Add Application';
        modalBtn.textContent = 'Add App';
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

  // ── Sub-links in modal ──

  const ICON_OPTIONS = [
    { icon: 'bi-globe', label: 'Globe' },
    { icon: 'bi-link-45deg', label: 'Link' },
    { icon: 'bi-youtube', label: 'YouTube' },
    { icon: 'bi-envelope-fill', label: 'Email' },
    { icon: 'bi-github', label: 'GitHub' },
    { icon: 'bi-twitter-x', label: 'X / Twitter' },
    { icon: 'bi-facebook', label: 'Facebook' },
    { icon: 'bi-instagram', label: 'Instagram' },
    { icon: 'bi-tiktok', label: 'TikTok' },
    { icon: 'bi-reddit', label: 'Reddit' },
    { icon: 'bi-chat-dots-fill', label: 'Chat' },
    { icon: 'bi-slack', label: 'Slack' },
    { icon: 'bi-discord', label: 'Discord' },
    { icon: 'bi-music-note-beamed', label: 'Music' },
    { icon: 'bi-play-circle-fill', label: 'Video' },
    { icon: 'bi-cart-fill', label: 'Cart' },
    { icon: 'bi-search', label: 'Search' },
    { icon: 'bi-book-fill', label: 'Book' },
    { icon: 'bi-camera-fill', label: 'Camera' },
    { icon: 'bi-mic-fill', label: 'Mic' },
    { icon: 'bi-calendar-event-fill', label: 'Calendar' },
    { icon: 'bi-bell-fill', label: 'Bell' },
    { icon: 'bi-cloud-fill', label: 'Cloud' },
    { icon: 'bi-code-slash', label: 'Code' },
    { icon: 'bi-terminal-fill', label: 'Terminal' },
    { icon: 'bi-file-earmark-text-fill', label: 'Document' },
    { icon: 'bi-folder-fill', label: 'Folder' },
    { icon: 'bi-image-fill', label: 'Image' },
    { icon: 'bi-bookmark-fill', label: 'Bookmark' },
    { icon: 'bi-box-arrow-up-right', label: 'External' },
    { icon: 'bi-star-fill', label: 'Star' },
    { icon: 'bi-heart-fill', label: 'Heart' },
    { icon: 'bi-rocket-fill', label: 'Rocket' },
    { icon: 'bi-fire', label: 'Trending' },
    { icon: 'bi-graduation-cap-fill', label: 'Education' },
    { icon: 'bi-briefcase-fill', label: 'Work' },
    { icon: 'bi-gamepad', label: 'Gaming' },
    { icon: 'bi-newspaper', label: 'News' },
    { icon: 'bi-credit-card-fill', label: 'Finance' },
    { icon: 'bi-tools', label: 'Tools' },
  ];

  let modalSubLinks = [];
  let modalAppIcon = '';
  let activeIconPicker = null;

  function getAllIconOptions() {
    const custom = (config.customIcons || []).map(icon => ({
      icon,
      label: icon.replace(/^bi-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      custom: true
    }));
    return [...ICON_OPTIONS, ...custom];
  }

  function renderCustomIcons() {
    const list = els.customIconsList;
    list.innerHTML = '';
    const icons = config.customIcons || [];

    if (icons.length === 0) {
      list.innerHTML = '<div class="text-white-50" style="font-size:0.75rem;">No custom icons added yet.</div>';
      return;
    }

    icons.forEach(icon => {
      const tag = document.createElement('span');
      tag.className = 'custom-icon-tag';
      tag.innerHTML = `<i class="bi ${icon}"></i><span>${icon}</span><button type="button" class="custom-icon-remove" data-icon="${icon}"><i class="bi bi-x"></i></button>`;
      list.appendChild(tag);
    });

    list.querySelectorAll('.custom-icon-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const iconClass = btn.getAttribute('data-icon');
        config.customIcons = config.customIcons.filter(i => i !== iconClass);
        saveConfig();
        renderCustomIcons();
      });
    });
  }

  function closeIconPicker() {
    if (activeIconPicker) {
      activeIconPicker.remove();
      activeIconPicker = null;
    }
  }

  function renderSubLinksInModal() {
    const container = els.subLinksContainer;
    container.innerHTML = '';

    modalSubLinks.forEach((sl, i) => {
      const row = document.createElement('div');
      row.className = 'sub-link-row';

      const selectedIcon = sl.icon || 'bi-globe';

      row.innerHTML = `
        <button type="button" class="btn btn-sm sub-link-icon-btn" data-picker-index="${i}" title="Choose icon">
          <i class="bi ${selectedIcon}"></i>
        </button>
        <input type="text" class="form-control form-control-sm bg-dark text-white border-secondary sub-link-name" placeholder="Label" value="${escapeHtml(sl.name)}">
        <input type="url" class="form-control form-control-sm bg-dark text-white border-secondary sub-link-url" placeholder="https://..." value="${escapeHtml(sl.url)}">
        <button type="button" class="btn btn-sm btn-outline-danger sub-link-remove" title="Remove"><i class="bi bi-x"></i></button>
      `;

      // Icon picker — opens a floating panel appended to body
      row.querySelector('.sub-link-icon-btn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeIconPicker();

        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();

        const menu = document.createElement('div');
        menu.className = 'sub-link-icon-menu-body';

        getAllIconOptions().forEach(opt => {
          const item = document.createElement('button');
          item.type = 'button';
          item.className = 'sub-link-icon-option-body' + (opt.icon === selectedIcon ? ' active' : '');
          item.innerHTML = `<i class="bi ${opt.icon}"></i><span>${opt.label}</span>`;
          item.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            modalSubLinks[i].icon = opt.icon;
            closeIconPicker();
            renderSubLinksInModal();
          });
          menu.appendChild(item);
        });

        document.body.appendChild(menu);

        // Position below the button, clamped to viewport
        let top = rect.bottom + 4;
        let left = rect.left;
        if (top + 260 > window.innerHeight) top = rect.top - 264;
        if (left + 190 > window.innerWidth) left = window.innerWidth - 196;
        menu.style.top = top + 'px';
        menu.style.left = left + 'px';

        activeIconPicker = menu;
      });

      row.querySelector('.sub-link-name').addEventListener('input', (e) => {
        modalSubLinks[i].name = e.target.value;
      });

      row.querySelector('.sub-link-url').addEventListener('input', (e) => {
        modalSubLinks[i].url = e.target.value;
      });

      row.querySelector('.sub-link-remove').addEventListener('click', () => {
        modalSubLinks.splice(i, 1);
        renderSubLinksInModal();
      });

      container.appendChild(row);
    });
  }

  function addSubLinkToModal(name = '', url = '', icon = 'bi-globe') {
    modalSubLinks.push({ id: generateId(), name, url, icon });
    renderSubLinksInModal();
  }

  // ── Event handlers ──

  function setupEvents() {
    document.addEventListener('click', (e) => {
      if (activeIconPicker && !activeIconPicker.contains(e.target) && !e.target.closest('.sub-link-icon-btn')) {
        closeIconPicker();
      }
    });

    els.settingsBtn.addEventListener('click', () => {
      syncSettingsUI();
      renderCustomIcons();
      settingsModal.show();
    });

    els.addCustomIconBtn.addEventListener('click', () => {
      const val = els.customIconInput.value.trim().toLowerCase();
      if (!val) return;
      const iconClass = val.startsWith('bi-') ? val : 'bi-' + val;
      if (config.customIcons.includes(iconClass)) {
        els.customIconInput.classList.add('is-invalid');
        return;
      }
      els.customIconInput.classList.remove('is-invalid');
      config.customIcons.push(iconClass);
      saveConfig();
      els.customIconInput.value = '';
      renderCustomIcons();
    });

    els.customIconInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        els.addCustomIconBtn.click();
      }
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

      const appEditBtn = e.target.closest('[data-edit-app]');
      if (appEditBtn) {
        e.preventDefault();
        e.stopPropagation();
        const appId = appEditBtn.getAttribute('data-edit-app');
        const sectionId = appEditBtn.getAttribute('data-section-id');
        const section = config.sections.find(s => s.id === sectionId);
        const app = section && section.apps.find(a => a.id === appId);
        if (!app) return;

        editAppTargetId = appId;
        editAppTargetSectionId = sectionId;
        addAppTargetSectionId = null;

        els.appName.value = app.name;
        els.appUrl.value = app.url;

        // Pre-fill app icon
        modalAppIcon = app.appIcon || '';
        if (modalAppIcon) {
          els.appIconPreview.className = `bi ${modalAppIcon}`;
          const matchedOpt = getAllIconOptions().find(o => o.icon === modalAppIcon);
          els.appIconLabel.textContent = matchedOpt ? matchedOpt.label : modalAppIcon;
          els.appIconValue.value = modalAppIcon;
          els.clearAppIconBtn.style.display = '';
        } else {
          els.appIconPreview.className = 'bi bi-globe';
          els.appIconLabel.textContent = 'Auto (from URL)';
          els.appIconValue.value = '';
          els.clearAppIconBtn.style.display = 'none';
        }

        // Pre-fill sub-links
        modalSubLinks = (app.subLinks || []).map(sl => ({ ...sl }));
        renderSubLinksInModal();

        const modalTitle = document.querySelector('#addAppModal .modal-title');
        const modalBtn = document.getElementById('saveAppBtn');
        modalTitle.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Edit Application';
        modalBtn.textContent = 'Save Changes';
        addAppModal.show();
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

    // ── Add / Edit App events ──

    els.addSubLinkBtn.addEventListener('click', () => {
      addSubLinkToModal();
    });

    // App icon picker
    els.appIconPickerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeIconPicker();

      const btn = e.currentTarget;
      const rect = btn.getBoundingClientRect();
      const menu = document.createElement('div');
      menu.className = 'sub-link-icon-menu-body';

      getAllIconOptions().forEach(opt => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'sub-link-icon-option-body' + (opt.icon === modalAppIcon ? ' active' : '');
        item.innerHTML = `<i class="bi ${opt.icon}"></i><span>${opt.label}</span>`;
        item.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          modalAppIcon = opt.icon;
          els.appIconPreview.className = `bi ${opt.icon}`;
          els.appIconLabel.textContent = opt.label;
          els.appIconValue.value = opt.icon;
          els.clearAppIconBtn.style.display = '';
          closeIconPicker();
        });
        menu.appendChild(item);
      });

      document.body.appendChild(menu);
      let top = rect.bottom + 4;
      let left = rect.left;
      if (top + 260 > window.innerHeight) top = rect.top - 264;
      if (left + 190 > window.innerWidth) left = window.innerWidth - 196;
      menu.style.top = top + 'px';
      menu.style.left = left + 'px';
      activeIconPicker = menu;
    });

    els.clearAppIconBtn.addEventListener('click', () => {
      modalAppIcon = '';
      els.appIconPreview.className = 'bi bi-globe';
      els.appIconLabel.textContent = 'Auto (from URL)';
      els.appIconValue.value = '';
      els.clearAppIconBtn.style.display = 'none';
    });

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

      // Collect sub-links from modal, ensuring URLs have protocol
      const subLinks = modalSubLinks
        .filter(sl => sl.name.trim() && sl.url.trim())
        .map(sl => ({
          id: sl.id || generateId(),
          name: sl.name.trim(),
          url: sl.url.trim().match(/^https?:\/\//) ? sl.url.trim() : 'https://' + sl.url.trim(),
          icon: sl.icon || ''
        }));

      if (editAppTargetId && editAppTargetSectionId) {
        // Edit mode
        const section = config.sections.find(s => s.id === editAppTargetSectionId);
        if (section) {
          const app = section.apps.find(a => a.id === editAppTargetId);
          if (app) {
            app.name = name;
            app.url = finalUrl;
            app.subLinks = subLinks;
            app.appIcon = modalAppIcon;
          }
        }
        editAppTargetId = null;
        editAppTargetSectionId = null;
      } else if (addAppTargetSectionId) {
        // Add mode
        const section = config.sections.find(s => s.id === addAppTargetSectionId);
        if (section) {
          section.apps.push({ id: generateId(), name, url: finalUrl, subLinks, appIcon: modalAppIcon });
        }
        addAppTargetSectionId = null;
      }

      modalSubLinks = [];
      modalAppIcon = '';
      saveConfig();
      renderSections();
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
          sections: imported.sections || [],
          customIcons: imported.customIcons || []
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
      sections: [],
      customIcons: []
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

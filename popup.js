// Popup script for proxy management interface
class ProxyPopup {
  constructor() {
    this.currentEditingId = null;
    this.init();
  }

  async init() {
    await this.loadState();
    this.loadVersion();
    this.bindEvents();
  }

  async loadState() {
    try {
      // Get proxy state from background script
      const response = await chrome.runtime.sendMessage({ action: 'getState' });
      
      if (response) {
        this.updateUI(response);
      }
    } catch (error) {
      console.error('Error loading state:', error);
    }
  }

  loadVersion() {
    // Get version from manifest
    const manifest = chrome.runtime.getManifest();
    const versionElement = document.getElementById('versionText');
    if (versionElement && manifest.version) {
      versionElement.textContent = `v${manifest.version}`;
    }
  }

  updateUI(state) {
    // Update proxy toggle
    const proxyToggle = document.getElementById('proxyToggle');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const dnsToggle = document.getElementById('dnsProxyToggle');

    proxyToggle.checked = state.enabled || false;
    dnsToggle.checked = state.dnsEnabled || false;
    
    if (state.enabled) {
      statusDot.classList.add('active');
      statusText.textContent = this.translations?.statusEnabled || 'Включен';
    } else {
      statusDot.classList.remove('active');
      statusText.textContent = this.translations?.statusDisabled || 'Отключен';
    }

    // Update servers list
    this.renderServers(state.servers || []);
  }

  renderServers(servers) {
    const serverList = document.getElementById('serverList');
    
    if (servers.length === 0) {
      const noServersText = this.translations?.noServers || 'Нет настроенных серверов';
      serverList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🌐</div>
          <div class="empty-state-text">${noServersText}</div>
        </div>
      `;
      return;
    }

    const exclusionsText = this.translations?.exclusions || 'исключений';
    
    serverList.innerHTML = servers.map(server => `
      <div class="server-item ${server.active ? 'active' : ''}" data-id="${server.id}">
        <div class="server-name">${this.escapeHtml(server.name)}</div>
        <div class="server-details">
          ${this.getServerTypeLabel(server.type)} • ${this.escapeHtml(server.host)}:${server.port}
          ${server.excludeList && server.excludeList.length > 0 ? ` • ${server.excludeList.length} ${exclusionsText}` : ''}
        </div>
        <div class="server-actions">
          <button class="btn-edit" data-id="${server.id}" title="Редактировать">✏️</button>
          <button class="btn-delete" data-id="${server.id}" title="Удалить">🗑️</button>
        </div>
      </div>
    `).join('');

    // Bind server item events
    this.bindServerEvents();
  }

  getServerTypeLabel(type) {
    const labels = {
      'http': 'HTTP/HTTPS'
    };
    return labels[type] || type.toUpperCase();
  }

  bindEvents() {
    // Proxy toggle
    document.getElementById('proxyToggle').addEventListener('change', (e) => {
      this.toggleProxy(e.target.checked);
    });

    // DNS toggle
    document.getElementById('dnsProxyToggle').addEventListener('change', (e) => {
      this.toggleDnsProxy(e.target.checked);
    });

    // Repository link
    document.getElementById('repoLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openRepository();
    });

    // Language selector
    document.getElementById('languageSelect').addEventListener('change', (e) => {
      this.changeLanguage(e.target.value);
    });

    // Update settings
    document.getElementById('checkUpdateBtn').addEventListener('click', () => {
      this.checkForUpdates();
    });

    document.getElementById('autoUpdateToggle').addEventListener('change', (e) => {
      this.toggleAutoUpdate(e.target.checked);
    });

    // Add server button
    document.getElementById('addServerBtn').addEventListener('click', () => {
      this.showAddServerForm();
    });

    // Form events
    document.getElementById('cancelBtn').addEventListener('click', () => {
      this.hideAddServerForm();
    });

    document.getElementById('cancelBtn2').addEventListener('click', () => {
      this.hideAddServerForm();
    });

    document.getElementById('serverForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveServer();
    });

    // Close form on overlay click
    document.getElementById('addServerForm').addEventListener('click', (e) => {
      if (e.target.id === 'addServerForm') {
        this.hideAddServerForm();
      }
    });

    // Load update settings and language
    this.loadUpdateSettings();
    this.loadLanguage();
  }

  bindServerEvents() {
    // Server selection
    document.querySelectorAll('.server-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn-edit') && !e.target.classList.contains('btn-delete')) {
          const serverId = item.dataset.id;
          this.selectServer(serverId);
        }
      });
    });

    // Edit buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const serverId = btn.dataset.id;
        this.editServer(serverId);
      });
    });

    // Delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const serverId = btn.dataset.id;
        this.deleteServer(serverId);
      });
    });
  }

  async toggleProxy(enabled) {
    try {
      await chrome.runtime.sendMessage({
        action: 'toggleProxy',
        enabled: enabled
      });
      
      // Update UI immediately
      const statusDot = document.getElementById('statusDot');
      const statusText = document.getElementById('statusText');
      
      if (enabled) {
        statusDot.classList.add('active');
        statusText.textContent = this.translations?.statusEnabled || 'Включен';
      } else {
        statusDot.classList.remove('active');
        statusText.textContent = this.translations?.statusDisabled || 'Отключен';
      }
    } catch (error) {
      console.error('Error toggling proxy:', error);
    }
  }

  async toggleDnsProxy(enabled) {
    try {
      await chrome.runtime.sendMessage({
        action: 'toggleDnsProxy',
        enabled: enabled
      });
    } catch (error) {
      console.error('Error toggling DNS proxy:', error);
    }
  }

  async selectServer(serverId) {
    try {
      await chrome.runtime.sendMessage({
        action: 'selectServer',
        serverId: serverId
      });
      
      // Update UI
      document.querySelectorAll('.server-item').forEach(item => {
        item.classList.remove('active');
      });
      
      const selectedItem = document.querySelector(`[data-id="${serverId}"]`);
      if (selectedItem) {
        selectedItem.classList.add('active');
      }
    } catch (error) {
      console.error('Error selecting server:', error);
    }
  }

  showAddServerForm(server = null) {
    const form = document.getElementById('addServerForm');
    const formTitle = document.getElementById('formTitle');
    const serverForm = document.getElementById('serverForm');
    
    if (server) {
      // Edit mode
      formTitle.textContent = 'Редактировать сервер';
      this.currentEditingId = server.id;
      
      // Fill form with server data
      document.getElementById('serverName').value = server.name;
      document.getElementById('serverType').value = server.type;
      document.getElementById('serverHost').value = server.host;
      document.getElementById('serverPort').value = server.port;
      document.getElementById('excludeList').value = server.excludeList ? server.excludeList.join('\n') : '';
    } else {
      // Add mode
      formTitle.textContent = 'Добавить сервер';
      this.currentEditingId = null;
      serverForm.reset();
    }
    
    form.style.display = 'flex';
  }

  hideAddServerForm() {
    const form = document.getElementById('addServerForm');
    form.style.display = 'none';
    this.currentEditingId = null;
  }

  async saveServer() {
    const formData = new FormData(document.getElementById('serverForm'));
    
    const serverData = {
      name: formData.get('serverName').trim(),
      type: formData.get('serverType'),
      host: formData.get('serverHost').trim(),
      port: parseInt(formData.get('serverPort')),
      excludeList: formData.get('excludeList')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    };

    // Validation
    if (!serverData.name || !serverData.host || !serverData.port) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (serverData.port < 1 || serverData.port > 65535) {
      alert('Порт должен быть от 1 до 65535');
      return;
    }

    try {
      if (this.currentEditingId) {
        // Update existing server
        await chrome.runtime.sendMessage({
          action: 'updateServer',
          serverId: this.currentEditingId,
          serverData: serverData
        });
      } else {
        // Add new server
        await chrome.runtime.sendMessage({
          action: 'addServer',
          serverData: serverData
        });
      }
      
      this.hideAddServerForm();
      await this.loadState(); // Reload to show updated list
    } catch (error) {
      console.error('Error saving server:', error);
      alert('Ошибка при сохранении сервера');
    }
  }

  async editServer(serverId) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getServer',
        serverId: serverId
      });
      
      if (response && response.server) {
        this.showAddServerForm(response.server);
      }
    } catch (error) {
      console.error('Error getting server for edit:', error);
    }
  }

  async deleteServer(serverId) {
    if (confirm('Вы уверены, что хотите удалить этот сервер?')) {
      try {
        await chrome.runtime.sendMessage({
          action: 'deleteServer',
          serverId: serverId
        });
        
        await this.loadState(); // Reload to show updated list
      } catch (error) {
        console.error('Error deleting server:', error);
      }
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Update functionality
  async loadUpdateSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getUpdateSettings' });
      
      if (response && response.updateSettings) {
        const autoUpdateToggle = document.getElementById('autoUpdateToggle');
        autoUpdateToggle.checked = response.updateSettings.autoCheck || false;
        
        // Show update frequency info
        const updateSection = document.querySelector('.update-section');
        const existingInfo = updateSection.querySelector('.update-frequency-info');
        if (existingInfo) {
          existingInfo.remove();
        }
        
        if (response.updateSettings.autoCheck) {
          const frequencyInfo = document.createElement('div');
          frequencyInfo.className = 'update-frequency-info';
          frequencyInfo.innerHTML = `
            <small>Автоматическая проверка каждый час с повторами при ошибках</small>
          `;
          updateSection.appendChild(frequencyInfo);
        }
      }
    } catch (error) {
      console.error('Error loading update settings:', error);
    }
  }

  async checkForUpdates() {
    const checkBtn = document.getElementById('checkUpdateBtn');
    const updateInfo = document.getElementById('updateInfo');
    const updateStatus = document.getElementById('updateStatus');
    const updateDetails = document.getElementById('updateDetails');

    // Show loading state
    checkBtn.textContent = 'Проверяем...';
    checkBtn.disabled = true;
    updateInfo.style.display = 'block';
    updateInfo.className = 'update-info';
    updateStatus.textContent = 'Проверка обновлений...';
    updateDetails.textContent = '';

    try {
      const response = await chrome.runtime.sendMessage({ action: 'checkForUpdates' });
      
      if (response && response.updateInfo) {
        const info = response.updateInfo;
        
        if (info.error) {
          // Error occurred
          updateInfo.className = 'update-info error';
          updateStatus.textContent = 'Ошибка при проверке обновлений';
          
          // Provide additional context for rate limiting
          if (info.error.includes('лимит запросов')) {
            updateDetails.innerHTML = `
              ${info.error}<br>
              <small>GitHub API ограничивает 60 запросов в час для неавторизованных пользователей.<br>
              Попробуйте проверить позже или отключите автоматические проверки.</small>
            `;
          } else {
            updateDetails.textContent = info.error;
          }
        } else if (info.hasUpdate) {
          // Update available
          updateInfo.className = 'update-info has-update';
          updateStatus.textContent = `Доступна новая версия ${info.latestVersion}!`;
          updateDetails.innerHTML = `
            Текущая версия: ${info.currentVersion}<br>
            <a href="${info.releaseUrl}" target="_blank" class="update-link">Открыть страницу релиза</a>
          `;
        } else {
          // No update
          updateInfo.className = 'update-info no-update';
          updateStatus.textContent = 'У вас установлена последняя версия';
          updateDetails.textContent = `Версия: ${info.currentVersion}`;
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      updateInfo.className = 'update-info error';
      updateStatus.textContent = 'Ошибка при проверке обновлений';
      updateDetails.textContent = error.message;
    } finally {
      // Reset button state
      checkBtn.textContent = 'Проверить';
      checkBtn.disabled = false;
    }
  }

  async toggleAutoUpdate(enabled) {
    try {
      await chrome.runtime.sendMessage({
        action: 'toggleAutoUpdate',
        enabled: enabled
      });
      
      // Update frequency info display
      await this.loadUpdateSettings();
    } catch (error) {
      console.error('Error toggling auto update:', error);
    }
  }

  async openRepository() {
    try {
      // Open GitHub repository in new tab
      await chrome.tabs.create({
        url: 'https://github.com/kalkalch/chromeproxy'
      });
    } catch (error) {
      console.error('Error opening repository:', error);
    }
  }

  async changeLanguage(language) {
    try {
      // Save language preference
      await chrome.storage.sync.set({ language: language });
      
      // Apply language immediately
      this.applyLanguage(language);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  }

  async loadLanguage() {
    try {
      // Load saved language preference
      const result = await chrome.storage.sync.get(['language']);
      const language = result.language || 'ru'; // Default to Russian
      
      // Set language selector
      const languageSelect = document.getElementById('languageSelect');
      languageSelect.value = language;
      
      // Apply language
      this.applyLanguage(language);
    } catch (error) {
      console.error('Error loading language:', error);
      // Default to Russian on error
      this.applyLanguage('ru');
    }
  }

  applyLanguage(language) {
    const translations = {
      ru: {
        statusEnabled: 'Включен',
        statusDisabled: 'Отключен',
        enableProxy: 'Включить прокси',
        dnsProxy: 'DNS запросы через прокси',
        dnsDescription: 'Направлять DNS запросы через прокси сервер (может замедлить соединение)',
        updates: 'Обновления',
        checkButton: 'Проверить',
        autoUpdate: 'Автоматическая проверка обновлений',
        servers: 'Серверы',
        addServer: '+ Добавить сервер',
        noServers: 'Нет настроенных серверов',
        exclusions: 'исключений',
        addServerTitle: 'Добавить сервер',
        editServerTitle: 'Редактировать сервер',
        serverName: 'Название сервера *',
        serverType: 'Тип прокси *',
        host: 'Хост *',
        port: 'Порт *',
        excludeList: 'Список исключений',
        excludeHelp: 'Домены и IP, которые не будут использовать прокси (по одному на строку)',
        cancel: 'Отмена',
        save: 'Сохранить'
      },
      en: {
        statusEnabled: 'Enabled',
        statusDisabled: 'Disabled',
        enableProxy: 'Enable proxy',
        dnsProxy: 'DNS queries through proxy',
        dnsDescription: 'Route DNS queries through proxy server (may slow down connection)',
        updates: 'Updates',
        checkButton: 'Check',
        autoUpdate: 'Automatic update checking',
        servers: 'Servers',
        addServer: '+ Add server',
        noServers: 'No configured servers',
        exclusions: 'exclusions',
        addServerTitle: 'Add server',
        editServerTitle: 'Edit server',
        serverName: 'Server name *',
        serverType: 'Proxy type *',
        host: 'Host *',
        port: 'Port *',
        excludeList: 'Exclude list',
        excludeHelp: 'Domains and IPs that will not use proxy (one per line)',
        cancel: 'Cancel',
        save: 'Save'
      }
    };

    const t = translations[language] || translations.ru;

    // Update UI elements
    document.querySelector('.toggle-label').textContent = t.enableProxy;
    document.querySelector('.checkbox-label').textContent = t.dnsProxy;
    document.querySelector('.dns-description').textContent = t.dnsDescription;
    document.querySelector('.update-section h3').textContent = `🔄 ${t.updates}`;
    document.getElementById('checkUpdateBtn').textContent = t.checkButton;
    document.querySelector('.update-section .checkbox-label').textContent = t.autoUpdate;
    document.querySelector('.server-section h3').textContent = t.servers;
    document.getElementById('addServerBtn').textContent = t.addServer;

    // Update status text
    const statusText = document.getElementById('statusText');
    const proxyToggle = document.getElementById('proxyToggle');
    statusText.textContent = proxyToggle.checked ? t.statusEnabled : t.statusDisabled;

    // Store current language for dynamic updates
    this.currentLanguage = language;
    this.translations = t;
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ProxyPopup();
}); 
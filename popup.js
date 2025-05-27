// Popup script for proxy management interface
class ProxyPopup {
  constructor() {
    this.currentEditingId = null;
    this.init();
  }

  async init() {
    // Check if extension context is valid
    if (!chrome.runtime?.id) {
      this.showConnectionError();
      return;
    }

    await this.loadState();
    this.loadVersion();
    this.bindEvents();
  }

  async loadState() {
    try {
      // Get proxy state from background script
      const response = await this.sendMessageWithRetry({ action: 'getState' });
      
      if (response) {
        this.updateUI(response);
      }
    } catch (error) {
      console.error('Error loading state:', error);
      this.showConnectionError();
    }
  }

  async sendMessageWithRetry(message, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await chrome.runtime.sendMessage(message);
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }
        return response;
      } catch (error) {
        console.warn(`Message attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        
        // Try to reload the extension context
        if (error.message.includes('Receiving end does not exist')) {
          try {
            await chrome.runtime.reload();
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (reloadError) {
            console.warn('Could not reload extension:', reloadError);
          }
        }
      }
    }
  }

  showConnectionError() {
    const container = document.querySelector('.container');
    const connectionErrorTitle = this.translations?.connectionError || 'Connection Error';
    const connectionErrorText = this.translations?.connectionErrorText || 'Unable to connect to extension background script.';
    const reloadText = this.translations?.reload || 'Reload';
    
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #ff4757;">
        <h3>⚠️ ${connectionErrorTitle}</h3>
        <p>${connectionErrorText}</p>
        <button onclick="location.reload()" style="
          background: #667eea; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 6px; 
          cursor: pointer;
          margin-top: 10px;
        ">${reloadText}</button>
      </div>
    `;
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
        <div class="server-info">
          <div class="server-name">${this.escapeHtml(server.name)}</div>
          <div class="server-details">
            ${this.getServerTypeLabel(server.type)} • ${this.escapeHtml(server.host)}:${server.port}
            ${server.excludeList && server.excludeList.length > 0 ? ` • ${server.excludeList.length} ${exclusionsText}` : ''}
          </div>
        </div>
        <div class="server-actions">
          <button class="btn-diagnose" data-id="${server.id}" title="Диагностика сервера">🔍</button>
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
        if (!e.target.classList.contains('btn-edit') && 
            !e.target.classList.contains('btn-delete') && 
            !e.target.classList.contains('btn-diagnose')) {
          const serverId = item.dataset.id;
          this.selectServer(serverId);
        }
      });
    });

    // Diagnose buttons
    document.querySelectorAll('.btn-diagnose').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const serverId = btn.dataset.id;
        this.diagnoseServer(serverId);
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
      await this.sendMessageWithRetry({
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
      const proxyErrorText = this.translations?.proxyError || 'Ошибка переключения прокси';
      alert(`${proxyErrorText}: ${error.message}`);
      // Revert toggle state
      const proxyToggle = document.getElementById('proxyToggle');
      proxyToggle.checked = !enabled;
    }
  }

  async toggleDnsProxy(enabled) {
    try {
      await this.sendMessageWithRetry({
        action: 'toggleDnsProxy',
        enabled: enabled
      });
    } catch (error) {
      console.error('Error toggling DNS proxy:', error);
      const dnsErrorText = this.translations?.dnsError || 'Ошибка переключения DNS';
      alert(`${dnsErrorText}: ${error.message}`);
      // Revert toggle state
      const dnsToggle = document.getElementById('dnsProxyToggle');
      dnsToggle.checked = !enabled;
    }
  }

  async selectServer(serverId) {
    try {
      await this.sendMessageWithRetry({
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
      const selectErrorText = this.translations?.selectError || 'Ошибка выбора сервера';
      alert(`${selectErrorText}: ${error.message}`);
    }
  }

  showAddServerForm(server = null) {
    const form = document.getElementById('addServerForm');
    const formTitle = document.getElementById('formTitle');
    const serverForm = document.getElementById('serverForm');
    
    if (server) {
      // Edit mode
      formTitle.textContent = this.translations?.editServerTitle || 'Edit HTTP/HTTPS Server';
      this.currentEditingId = server.id;
      
      // Fill form with server data
      document.getElementById('serverName').value = server.name;
      document.getElementById('serverHost').value = server.host;
      document.getElementById('serverPort').value = server.port;
      document.getElementById('excludeList').value = server.excludeList ? server.excludeList.join('\n') : '';
    } else {
      // Add mode
      formTitle.textContent = this.translations?.addServerTitle || 'Add HTTP/HTTPS Server';
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
      type: 'http',
      host: formData.get('serverHost').trim(),
      port: parseInt(formData.get('serverPort')),
      excludeList: formData.get('excludeList')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    };

    // Validation
    if (!serverData.name || !serverData.host || !serverData.port) {
      const fillFieldsText = this.translations?.fillAllFields || 'Please fill in all required fields';
      alert(fillFieldsText);
      return;
    }

    if (serverData.port < 1 || serverData.port > 65535) {
      const portRangeText = this.translations?.portRange || 'Port must be between 1 and 65535';
      alert(portRangeText);
      return;
    }

    try {
      if (this.currentEditingId) {
        // Update existing server
        await this.sendMessageWithRetry({
          action: 'updateServer',
          serverId: this.currentEditingId,
          serverData: serverData
        });
      } else {
        // Add new server
        await this.sendMessageWithRetry({
          action: 'addServer',
          serverData: serverData
        });
      }
      
      this.hideAddServerForm();
      await this.loadState(); // Reload to show updated list
    } catch (error) {
      console.error('Error saving server:', error);
      const saveErrorText = this.translations?.saveError || 'Error saving server';
      alert(saveErrorText);
    }
  }

  async editServer(serverId) {
    try {
      const response = await this.sendMessageWithRetry({
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
    const confirmText = this.translations?.confirmDelete || 'Вы уверены, что хотите удалить этот сервер?';
    if (confirm(confirmText)) {
      try {
        await this.sendMessageWithRetry({
          action: 'deleteServer',
          serverId: serverId
        });
        
        // Reload state
        await this.loadState();
      } catch (error) {
        console.error('Error deleting server:', error);
      }
    }
  }

  async diagnoseServer(serverId) {
    try {
      // Show loading state
      const btn = document.querySelector(`[data-id="${serverId}"].btn-diagnose`);
      const originalText = btn.textContent;
      btn.textContent = '⏳';
      btn.disabled = true;

      // Get server details
      const response = await this.sendMessageWithRetry({
        action: 'getServerDetails',
        serverId: serverId
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get server details');
      }

      const server = response.server;
      
      // Test proxy connection
      const testResult = await this.testProxyConnection(server);
      
      // Show results
      this.showDiagnosticResults(server, testResult);

    } catch (error) {
      console.error('Error diagnosing server:', error);
      const errorText = this.translations?.diagnosticError || 'Ошибка диагностики';
      alert(`${errorText}: ${error.message}`);
    } finally {
      // Restore button state
      const btn = document.querySelector(`[data-id="${serverId}"].btn-diagnose`);
      if (btn) {
        btn.textContent = '🔍';
        btn.disabled = false;
      }
    }
  }

  async testProxyConnection(server) {
    try {
      // First, temporarily apply this server's proxy settings for testing
      const testResult = await this.sendMessageWithRetry({
        action: 'testProxyServer',
        server: server
      });

      if (testResult.success) {
        return testResult.result;
      } else {
        return {
          success: false,
          error: testResult.error || 'Test failed',
          status: 'error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'error'
      };
    }
  }

  showDiagnosticResults(server, testResult) {
    let statusText, statusIcon;
    
    if (testResult.success) {
      if (testResult.ipChanged) {
        statusText = this.translations?.trafficThroughProxy || 'Трафик идет через прокси';
        statusIcon = '✅';
      } else if (testResult.proxyIp) {
        statusText = this.translations?.trafficNotThroughProxy || 'Трафик НЕ идет через прокси';
        statusIcon = '⚠️';
      } else {
        statusText = this.translations?.diagnosticSuccess || 'Подключение успешно';
        statusIcon = '✅';
      }
    } else {
      if (testResult.status === 'unreachable') {
        statusText = this.translations?.serverUnavailable || 'Сервер недоступен';
        statusIcon = '❌';
      } else if (testResult.status === 'timeout') {
        statusText = this.translations?.connectionTimeout || 'Превышено время ожидания';
        statusIcon = '⏱️';
      } else {
        statusText = this.translations?.diagnosticFailed || 'Подключение не удалось';
        statusIcon = '❌';
      }
    }
    
    const responseTimeText = testResult.responseTime ? 
      `${this.translations?.responseTime || 'Время ответа'}: ${testResult.responseTime}ms` : '';
    
    // Показываем только итоговый IP
    let ipInfo = '';
    if (testResult.proxyIp) {
      ipInfo = `🌐 ${this.translations?.yourIP || 'Ваш IP'}: ${testResult.proxyIp}`;
    }
    
    const errorText = testResult.error ? 
      `${this.translations?.error || 'Ошибка'}: ${testResult.error}` : '';
    
    const message = [
      `${statusIcon} ${server.name} (${server.host}:${server.port})`,
      statusText,
      responseTimeText,
      ipInfo,
      errorText
    ].filter(Boolean).join('\n');

    alert(message);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Update functionality
  async loadUpdateSettings() {
    try {
      const response = await this.sendMessageWithRetry({ action: 'getUpdateSettings' });
      
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
      const response = await this.sendMessageWithRetry({ action: 'checkForUpdates' });
      
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
      await this.sendMessageWithRetry({
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

  // Language functionality
  async changeLanguage(language) {
    try {
      // Save language preference
      await chrome.storage.sync.set({ language: language });
      
      // Apply language immediately
      this.applyLanguage(language);
    } catch (error) {
      console.error('Error changing language:', error);
      const languageErrorText = this.translations?.languageError || 'Ошибка смены языка';
      alert(`${languageErrorText}: ${error.message}`);
    }
  }

  async loadLanguage() {
    try {
      // Load saved language preference
      const result = await chrome.storage.sync.get(['language']);
      const language = result.language || 'en'; // Default to English
      
      // Set language selector
      const languageSelect = document.getElementById('languageSelect');
      languageSelect.value = language;
      
      // Apply language
      this.applyLanguage(language);
    } catch (error) {
      console.error('Error loading language:', error);
      // Default to English on error
      this.applyLanguage('en');
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
        addServerTitle: 'Добавить HTTP/HTTPS сервер',
        editServerTitle: 'Редактировать HTTP/HTTPS сервер',
        serverName: 'Название сервера *',
        serverType: 'Тип прокси *',
        host: 'Хост *',
        port: 'Порт *',
        excludeList: 'Список исключений',
        excludeHelp: 'Домены и IP, которые не будут использовать прокси (по одному на строку)',
        cancel: 'Отмена',
        save: 'Сохранить',
        confirmDelete: 'Вы уверены, что хотите удалить этот сервер?',
        diagnosticError: 'Ошибка диагностики',
        diagnosticSuccess: 'Подключение успешно',
        diagnosticFailed: 'Подключение не удалось',
        responseTime: 'Время ответа',
        currentIP: 'Текущий IP',
        error: 'Ошибка',
        trafficThroughProxy: 'Трафик идет через прокси',
        trafficNotThroughProxy: 'Трафик НЕ идет через прокси',
        serverUnavailable: 'Сервер недоступен',
        connectionTimeout: 'Превышено время ожидания',
        yourIP: 'Ваш IP',
        fillAllFields: 'Пожалуйста, заполните все обязательные поля',
        portRange: 'Порт должен быть от 1 до 65535',
        saveError: 'Ошибка при сохранении сервера',
        connectionError: 'Ошибка подключения',
        connectionErrorText: 'Не удается связаться с фоновым скриптом расширения.',
        reload: 'Перезагрузить',
        proxyError: 'Ошибка переключения прокси',
        dnsError: 'Ошибка переключения DNS',
        selectError: 'Ошибка выбора сервера',
        languageError: 'Ошибка смены языка'
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
        addServerTitle: 'Add HTTP/HTTPS server',
        editServerTitle: 'Edit HTTP/HTTPS server',
        serverName: 'Server name *',
        serverType: 'Proxy type *',
        host: 'Host *',
        port: 'Port *',
        excludeList: 'Exclude list',
        excludeHelp: 'Domains and IPs that will not use proxy (one per line)',
        cancel: 'Cancel',
        save: 'Save',
        confirmDelete: 'Are you sure you want to delete this server?',
        diagnosticError: 'Diagnostic error',
        diagnosticSuccess: 'Connection successful',
        diagnosticFailed: 'Connection failed',
        responseTime: 'Response time',
        currentIP: 'Current IP',
        error: 'Error',
        trafficThroughProxy: 'Traffic goes through proxy',
        trafficNotThroughProxy: 'Traffic does NOT go through proxy',
        serverUnavailable: 'Server unavailable',
        connectionTimeout: 'Connection timeout',
        yourIP: 'Your IP',
        fillAllFields: 'Please fill in all required fields',
        portRange: 'Port must be between 1 and 65535',
        saveError: 'Error saving server',
        connectionError: 'Connection Error',
        connectionErrorText: 'Unable to connect to extension background script.',
        reload: 'Reload',
        proxyError: 'Proxy switching error',
        dnsError: 'DNS switching error',
        selectError: 'Server selection error',
        languageError: 'Language switching error'
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
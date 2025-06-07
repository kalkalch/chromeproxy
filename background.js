// Background script for proxy management
class ProxyManager {
  constructor() {
    this.state = {
      enabled: false,
      dnsEnabled: false, // DNS through proxy
      servers: [],
      activeServerId: null,
      updateSettings: {
        autoCheck: true,
        autoInstall: false, // Auto-install updates
        lastCheck: null,
        checkInterval: 60 * 60 * 1000, // 1 hour in milliseconds (changed from 24 hours)
        updateUrl: 'https://api.github.com/repos/kalkalch/chromeproxy/releases/latest',
        maxRetries: 5, // Maximum number of retry attempts
        retryDelay: 5000, // Initial retry delay in milliseconds (5 seconds)
        currentRetries: 0 // Current retry count
      },
      // Version tracking for migrations
      settingsVersion: '0.0.1', // Current settings version
      lastExtensionVersion: null // Last known extension version
    };
    
    this.init();
  }

  async init() {
    // Load saved state
    await this.loadState();
    
    // Check for extension updates and migrate settings if needed
    await this.checkExtensionUpdate();
    
    // Set up message listener with error handling
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Handle message asynchronously
      this.handleMessage(message, sender, sendResponse).catch(error => {
        console.error('Error in message handler:', error);
        sendResponse({ error: error.message });
      });
      return true; // Keep message channel open for async response
    });

    // Handle extension install/update events
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallEvent(details);
    });

    // Update icon on startup
    this.updateIcon();
    
    // Check for updates on startup if auto-check is enabled
    if (this.state.updateSettings.autoCheck) {
      this.scheduleUpdateCheck();
    }

    console.log('ProxyManager initialized successfully');
  }

  async loadState() {
    try {
      const result = await chrome.storage.sync.get(['proxyState']);
      if (result.proxyState) {
        // Merge with defaults to ensure all properties exist
        this.state = this.mergeWithDefaults(result.proxyState);
      }
    } catch (error) {
      console.error('Error loading state:', error);
      // If loading fails, use default state
      console.log('Using default state due to loading error');
    }
  }

  async saveState() {
    try {
      // Create backup before saving new state
      await this.createBackup();
      
      await chrome.storage.sync.set({ proxyState: this.state });
    } catch (error) {
      console.error('Error saving state:', error);
      
      // Try to restore from backup if save failed
      try {
        await this.restoreFromBackup();
        console.log('Restored settings from backup after save failure');
      } catch (backupError) {
        console.error('Failed to restore from backup:', backupError);
      }
    }
  }

  async createBackup() {
    try {
      const backupData = {
        timestamp: Date.now(),
        version: chrome.runtime.getManifest().version,
        state: JSON.parse(JSON.stringify(this.state)) // Deep copy
      };
      
      await chrome.storage.local.set({ 
        proxyStateBackup: backupData 
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      // Don't throw error - backup failure shouldn't prevent normal operation
    }
  }

  async restoreFromBackup() {
    try {
      const result = await chrome.storage.local.get(['proxyStateBackup']);
      if (result.proxyStateBackup && result.proxyStateBackup.state) {
        console.log('Restoring from backup created at:', new Date(result.proxyStateBackup.timestamp));
        this.state = this.mergeWithDefaults(result.proxyStateBackup.state);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      return false;
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'getState':
          sendResponse(this.getStateForPopup());
          break;

        case 'toggleProxy':
          await this.toggleProxy(message.enabled);
          sendResponse({ success: true });
          break;

        case 'toggleDnsProxy':
          await this.toggleDnsProxy(message.enabled);
          sendResponse({ success: true });
          break;

        case 'selectServer':
          await this.selectServer(message.serverId);
          sendResponse({ success: true });
          break;

        case 'addServer':
          await this.addServer(message.serverData);
          sendResponse({ success: true });
          break;

        case 'updateServer':
          await this.updateServer(message.serverId, message.serverData);
          sendResponse({ success: true });
          break;

        case 'deleteServer':
          await this.deleteServer(message.serverId);
          sendResponse({ success: true });
          break;

        case 'getServer':
          const server = this.getServer(message.serverId);
          sendResponse({ server });
          break;

        case 'getServerDetails':
          const serverDetails = this.getServer(message.serverId);
          if (serverDetails) {
            sendResponse({ success: true, server: serverDetails });
          } else {
            sendResponse({ success: false, error: 'Сервер не найден' });
          }
          break;

        case 'testProxyServer':
          const testResult = await this.testProxyServer(message.server);
          sendResponse(testResult);
          break;

        case 'checkForUpdates':
          const updateInfo = await this.checkForUpdates();
          sendResponse({ updateInfo });
          break;

        case 'toggleAutoUpdate':
          await this.toggleAutoUpdate(message.enabled);
          sendResponse({ success: true });
          break;

        case 'getUpdateSettings':
          sendResponse({ 
            updateSettings: this.state.updateSettings,
            currentVersion: chrome.runtime.getManifest().version
          });
          break;

        case 'getProxyDiagnostics':
          const diagnostics = await this.getCurrentProxySettings();
          sendResponse({ diagnostics });
          break;

        case 'forceApplyProxy':
          const activeServer = this.getActiveServer();
          if (activeServer && this.state.enabled) {
            await this.applyProxySettings(activeServer);
            sendResponse({ success: true, message: 'Настройки прокси переприменены' });
          } else {
            sendResponse({ success: false, message: 'Нет активного сервера или прокси отключен' });
          }
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  getStateForPopup() {
    return {
      enabled: this.state.enabled,
      dnsEnabled: this.state.dnsEnabled,
      servers: this.state.servers.map(server => ({
        ...server,
        active: server.id === this.state.activeServerId
      }))
    };
  }

  async toggleProxy(enabled) {
    console.log(`Toggling proxy: ${enabled}`);
    
    // Check if we have proxy permission
    try {
      const hasPermission = await chrome.permissions.contains({
        permissions: ['proxy']
      });
      
      if (!hasPermission) {
        throw new Error('Отсутствует разрешение "proxy". Переустановите расширение.');
      }
    } catch (permError) {
      console.error('Permission check failed:', permError);
      // Continue anyway, as the permission might be granted but check failed
    }
    
    this.state.enabled = enabled;
    
    if (enabled) {
      // Enable proxy with active server
      const activeServer = this.getActiveServer();
      console.log('Active server for proxy:', activeServer);
      
      if (activeServer) {
        console.log('Applying proxy settings for active server...');
        await this.applyProxySettings(activeServer);
      } else if (this.state.servers.length > 0) {
        // Auto-select first server if none is active
        console.log('No active server, selecting first available...');
        await this.selectServer(this.state.servers[0].id);
        await this.applyProxySettings(this.state.servers[0]);
      } else {
        // No servers available
        this.state.enabled = false;
        throw new Error('Нет доступных серверов для подключения');
      }
    } else {
      // Disable proxy
      console.log('Clearing proxy settings...');
      await this.clearProxySettings();
    }

    await this.saveState();
    this.updateIcon();
    
    console.log(`Proxy toggle completed. Enabled: ${this.state.enabled}`);
  }

  async toggleDnsProxy(enabled) {
    console.log(`DNS through proxy setting changed to: ${enabled}`);
    this.state.dnsEnabled = enabled;
    
    // Note: This setting is now informational only and doesn't affect proxy configuration
    // DNS handling is managed by the proxy server itself
    
    await this.saveState();
    console.log('DNS setting saved (informational only)');
  }

  async selectServer(serverId) {
    const server = this.state.servers.find(s => s.id === serverId);
    if (!server) {
      throw new Error('Сервер не найден');
    }

    this.state.activeServerId = serverId;

    // If proxy is enabled, apply new server settings
    if (this.state.enabled) {
      await this.applyProxySettings(server);
    }

    await this.saveState();
  }

  async addServer(serverData) {
    const server = {
      id: Date.now().toString(),
      name: serverData.name,
      type: serverData.type,
      host: serverData.host,
      port: serverData.port,
      username: serverData.username || '',
      password: serverData.password || '',
      excludeList: serverData.excludeList || []
    };

    this.state.servers.push(server);

    // If this is the first server and no active server is set, make it active
    if (this.state.servers.length === 1 && !this.state.activeServerId) {
      this.state.activeServerId = server.id;
    }

    await this.saveState();
  }

  async updateServer(serverId, serverData) {
    const serverIndex = this.state.servers.findIndex(s => s.id === serverId);
    if (serverIndex === -1) {
      throw new Error('Сервер не найден');
    }

    this.state.servers[serverIndex] = {
      ...this.state.servers[serverIndex],
      name: serverData.name,
      type: serverData.type,
      host: serverData.host,
      port: serverData.port,
      username: serverData.username || '',
      password: serverData.password || '',
      excludeList: serverData.excludeList || []
    };

    // If this server is currently active and proxy is enabled, reapply settings
    if (this.state.activeServerId === serverId && this.state.enabled) {
      await this.applyProxySettings(this.state.servers[serverIndex]);
    }

    await this.saveState();
  }

  async deleteServer(serverId) {
    const serverIndex = this.state.servers.findIndex(s => s.id === serverId);
    if (serverIndex === -1) {
      throw new Error('Сервер не найден');
    }

    this.state.servers.splice(serverIndex, 1);

    // If deleted server was active, clear active server and disable proxy
    if (this.state.activeServerId === serverId) {
      this.state.activeServerId = null;
      this.state.enabled = false;
      await this.clearProxySettings();
    }

    await this.saveState();
    this.updateIcon();
  }

  getServer(serverId) {
    return this.state.servers.find(s => s.id === serverId);
  }

  getActiveServer() {
    return this.state.servers.find(s => s.id === this.state.activeServerId);
  }

  async applyProxySettings(server) {
    try {
      console.log('Applying proxy settings for server:', server);
      
      let config;
      
      // If authentication is configured, use PAC script approach
      if (server.username && server.password) {
        console.log(`Configuring authenticated proxy for user: ${server.username}`);
        
        // Create PAC script with embedded credentials
        const pacScript = `
          function FindProxyForURL(url, host) {
            return "PROXY ${server.username}:${server.password}@${server.host}:${server.port}";
          }
        `;
        
        config = {
          mode: 'pac_script',
          pacScript: {
            data: pacScript
          }
        };
      } else {
        // Standard proxy configuration without authentication
        config = {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: this.getProxyScheme(server.type),
              host: server.host,
              port: parseInt(server.port)
            },
            bypassList: server.excludeList || []
          }
        };
      }

      console.log('Proxy config to apply:', JSON.stringify(config, null, 2));

      // Use Promise-based approach for better error handling
      return new Promise((resolve, reject) => {
        chrome.proxy.settings.set({
          value: config,
          scope: 'regular'
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Chrome proxy API error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          console.log('Proxy settings applied successfully');
          
          // Verify settings were applied after a short delay
          setTimeout(async () => {
            try {
              const currentSettings = await this.getCurrentProxySettings();
              console.log('Current proxy settings after apply:', currentSettings);
              
              if (currentSettings && currentSettings.value) {
                if (currentSettings.value.mode === 'system') {
                  console.warn('Warning: Proxy settings reverted to system mode');
                } else if (currentSettings.value.mode === 'fixed_servers') {
                  console.log('Success: Proxy settings are in fixed_servers mode');
                  if (currentSettings.value.rules?.singleProxy) {
                    const proxy = currentSettings.value.rules.singleProxy;
                    console.log(`Active proxy: ${proxy.scheme}://${proxy.host}:${proxy.port}`);
                  }
                } else if (currentSettings.value.mode === 'pac_script') {
                  console.log('Success: Proxy settings are in PAC script mode (with authentication)');
                } else {
                  console.warn(`Unexpected proxy mode: ${currentSettings.value.mode}`);
                }
              }
            } catch (verifyError) {
              console.error('Error verifying proxy settings:', verifyError);
            }
          }, 1000);
          
          resolve();
        });
      });
    } catch (error) {
      console.error('Error applying proxy settings:', error);
      throw error;
    }
  }

  async clearProxySettings() {
    try {
      return new Promise((resolve, reject) => {
        chrome.proxy.settings.clear({ scope: 'regular' }, () => {
          if (chrome.runtime.lastError) {
            console.error('Chrome proxy API error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          console.log('Proxy settings cleared');
          resolve();
        });
      });
    } catch (error) {
      console.error('Error clearing proxy settings:', error);
      throw error;
    }
  }

  async getCurrentProxySettings() {
    try {
      return new Promise((resolve, reject) => {
        chrome.proxy.settings.get({ incognito: false }, (settings) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome proxy API error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          console.log('Current proxy settings:', settings);
          resolve(settings);
        });
      });
    } catch (error) {
      console.error('Error getting current proxy settings:', error);
      return null;
    }
  }

  getProxyScheme(type) {
    // Map server types to Chrome proxy schemes
    switch (type) {
      case 'http':
        return 'http'; // HTTP/HTTPS combined
      default:
        return 'http';
    }
  }

  updateIcon() {
    const iconPath = this.state.enabled ? 'icons/icon32.png' : 'icons/icon32-disabled.png';
    const title = this.state.enabled ? 'Proxy Manager - Включен' : 'Proxy Manager - Отключен';
    
    chrome.action.setIcon({ path: iconPath });
    chrome.action.setTitle({ title: title });
  }

  // Update checking functionality
  async checkForUpdates(retryCount = 0) {
    try {
      const currentVersion = chrome.runtime.getManifest().version;
      
      // Add headers to potentially reduce rate limiting
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': `Chrome-Proxy-Manager/${currentVersion}`
      };
      
      const response = await fetch(this.state.updateSettings.updateUrl, { headers });
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        let shouldRetry = false;
        
        if (response.status === 403) {
          errorMessage = 'Превышен лимит запросов к GitHub API. Попробуйте позже.';
          // Don't retry on rate limit
          shouldRetry = false;
        } else if (response.status === 404) {
          errorMessage = 'Репозиторий или релизы не найдены.';
          // Don't retry on 404
          shouldRetry = false;
        } else if (response.status >= 500) {
          errorMessage = 'Сервер GitHub временно недоступен.';
          // Retry on server errors
          shouldRetry = true;
        } else {
          errorMessage = `${errorMessage}: ${response.statusText}`;
          // Retry on other errors
          shouldRetry = true;
        }
        
        // Attempt retry if conditions are met
        if (shouldRetry && retryCount < this.state.updateSettings.maxRetries) {
          console.log(`Update check failed (attempt ${retryCount + 1}/${this.state.updateSettings.maxRetries + 1}), retrying...`);
          
          // Exponential backoff: delay = retryDelay * (2 ^ retryCount)
          const delay = this.state.updateSettings.retryDelay * Math.pow(2, retryCount);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.checkForUpdates(retryCount + 1);
        }
        
        throw new Error(errorMessage);
      }
      
      const releaseData = await response.json();
      
      if (!releaseData.tag_name) {
        throw new Error('Некорректный ответ от GitHub API');
      }
      
      const latestVersion = releaseData.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present
      
      // Update last check time and reset retry count on success
      this.state.updateSettings.lastCheck = Date.now();
      this.state.updateSettings.currentRetries = 0;
      await this.saveState();
      
      const hasUpdate = this.compareVersions(currentVersion, latestVersion) < 0;
      
      return {
        hasUpdate,
        currentVersion,
        latestVersion,
        releaseUrl: releaseData.html_url,
        releaseNotes: releaseData.body,
        publishedAt: releaseData.published_at
      };
    } catch (error) {
      console.error('Error checking for updates:', error);
      
      // If this was a retry attempt that failed, try again if we haven't exceeded max retries
      if (retryCount < this.state.updateSettings.maxRetries && 
          !error.message.includes('лимит запросов') && 
          !error.message.includes('не найдены')) {
        
        console.log(`Update check failed (attempt ${retryCount + 1}/${this.state.updateSettings.maxRetries + 1}), retrying...`);
        
        // Exponential backoff
        const delay = this.state.updateSettings.retryDelay * Math.pow(2, retryCount);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.checkForUpdates(retryCount + 1);
      }
      
      // Provide more user-friendly error messages
      let userMessage = error.message;
      if (error.message.includes('Failed to fetch')) {
        userMessage = 'Нет подключения к интернету или GitHub недоступен.';
      } else if (error.message.includes('NetworkError')) {
        userMessage = 'Ошибка сети. Проверьте подключение к интернету.';
      }
      
      // Add retry information to error message
      if (retryCount > 0) {
        userMessage += ` (Попыток: ${retryCount + 1}/${this.state.updateSettings.maxRetries + 1})`;
      }
      
      return {
        hasUpdate: false,
        error: userMessage,
        currentVersion: chrome.runtime.getManifest().version
      };
    }
  }

  compareVersions(version1, version2) {
    // Compare semantic versions (e.g., "1.0.0" vs "1.0.1")
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part < v2part) return -1;
      if (v1part > v2part) return 1;
    }
    
    return 0;
  }

  async toggleAutoUpdate(enabled) {
    this.state.updateSettings.autoCheck = enabled;
    await this.saveState();
    
    if (enabled) {
      this.scheduleUpdateCheck();
    } else {
      this.clearUpdateSchedule();
    }
  }

  scheduleUpdateCheck() {
    // Clear existing schedule
    this.clearUpdateSchedule();
    
    // Check if enough time has passed since last check
    const now = Date.now();
    const lastCheck = this.state.updateSettings.lastCheck || 0;
    const timeSinceLastCheck = now - lastCheck;
    
    if (timeSinceLastCheck >= this.state.updateSettings.checkInterval) {
      // Check immediately
      this.performScheduledUpdateCheck();
    } else {
      // Schedule next check
      const timeUntilNextCheck = this.state.updateSettings.checkInterval - timeSinceLastCheck;
      this.updateCheckTimeout = setTimeout(() => {
        this.performScheduledUpdateCheck();
      }, timeUntilNextCheck);
    }
  }

  clearUpdateSchedule() {
    if (this.updateCheckTimeout) {
      clearTimeout(this.updateCheckTimeout);
      this.updateCheckTimeout = null;
    }
  }

  async performScheduledUpdateCheck() {
    try {
      console.log('Performing scheduled update check...');
      const updateInfo = await this.checkForUpdates();
      
      if (updateInfo.error) {
        console.log('Update check failed:', updateInfo.error);
        
        // If we got a rate limit error, temporarily disable auto-checks
        if (updateInfo.error.includes('лимит запросов')) {
          console.log('Rate limit hit, temporarily disabling auto-checks');
          // Don't schedule next check for rate limit errors
          return;
        }
        
        // For other errors, continue with normal scheduling
        // The retry logic is already handled in checkForUpdates
      }
      
      if (updateInfo.hasUpdate) {
        console.log(`New version available: ${updateInfo.latestVersion}`);
        
        // If auto-install is enabled, try to download the update
        if (this.state.updateSettings.autoInstall) {
          await this.handleAutoInstall(updateInfo);
        } else {
          // Show notification about available update
          this.showUpdateNotification(updateInfo);
        }
      } else {
        console.log('No updates available');
      }
      
      // Schedule next check only if no rate limit error
      this.scheduleUpdateCheck();
    } catch (error) {
      console.error('Error in scheduled update check:', error);
      
      // Schedule next check even if this one failed (unless it's a rate limit)
      if (!error.message.includes('403') && !error.message.includes('лимит')) {
        this.scheduleUpdateCheck();
      } else {
        console.log('Skipping next scheduled check due to rate limiting');
      }
    }
  }

  showUpdateNotification(updateInfo) {
    chrome.notifications.create('update-available', {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Chrome Proxy Manager',
      message: `Доступна новая версия ${updateInfo.latestVersion}!`,
      buttons: [
        { title: 'Скачать обновление' },
        { title: 'Напомнить позже' }
      ]
    });

    // Handle notification button clicks
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      if (notificationId === 'update-available') {
        if (buttonIndex === 0) {
          // Download update
          this.downloadUpdate(updateInfo);
        }
        chrome.notifications.clear(notificationId);
      }
    });

    // Handle notification click
    chrome.notifications.onClicked.addListener((notificationId) => {
      if (notificationId === 'update-available') {
        chrome.tabs.create({ url: updateInfo.releaseUrl });
        chrome.notifications.clear(notificationId);
      }
    });
  }

  async handleAutoInstall(updateInfo) {
    try {
      console.log('Auto-installing update...');
      const downloadResult = await this.downloadUpdate(updateInfo);
      
      if (downloadResult.success) {
        // Show notification that update is ready
        chrome.notifications.create('update-ready', {
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Chrome Proxy Manager',
          message: `Обновление ${updateInfo.latestVersion} готово к установке!`,
          buttons: [
            { title: 'Установить сейчас' },
            { title: 'Установить позже' }
          ]
        });

        // Handle installation
        chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
          if (notificationId === 'update-ready' && buttonIndex === 0) {
            this.showInstallInstructions(updateInfo, downloadResult.filePath);
            chrome.notifications.clear(notificationId);
          }
        });
      }
    } catch (error) {
      console.error('Auto-install failed:', error);
      // Fallback to manual notification
      this.showUpdateNotification(updateInfo);
    }
  }

  async downloadUpdate(updateInfo) {
    try {
      // Get download URL for the zip file
      const response = await fetch(updateInfo.releaseUrl.replace('/tag/', '/download/') + '/chrome-proxy-manager.zip');
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      // For Chrome extensions, we can't directly download files to disk
      // Instead, we'll open the download page
      chrome.tabs.create({ 
        url: updateInfo.releaseUrl,
        active: false 
      });

      // Store update info for later use
      await chrome.storage.local.set({
        pendingUpdate: {
          version: updateInfo.latestVersion,
          downloadUrl: updateInfo.releaseUrl,
          timestamp: Date.now()
        }
      });

      return {
        success: true,
        filePath: 'Downloads/chrome-proxy-manager.zip'
      };
    } catch (error) {
      console.error('Download failed:', error);
      return { success: false, error: error.message };
    }
  }

  showInstallInstructions(updateInfo, filePath) {
    // Create a detailed notification with installation instructions
    chrome.notifications.create('install-instructions', {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Установка обновления',
      message: `Файл скачан. Нажмите для просмотра инструкций по установке.`
    });

    chrome.notifications.onClicked.addListener((notificationId) => {
      if (notificationId === 'install-instructions') {
        // Open installation instructions page
        this.openInstallInstructionsPage(updateInfo);
        chrome.notifications.clear(notificationId);
      }
    });
  }

  async openInstallInstructionsPage(updateInfo) {
    // Create a simple HTML page with instructions
    const instructionsHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Установка обновления Chrome Proxy Manager</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
          .step { margin: 15px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
          .step-number { background: #667eea; color: white; border-radius: 50%; width: 25px; height: 25px; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { background: #667eea; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚀 Обновление Chrome Proxy Manager</h1>
          <p>Версия ${updateInfo.latestVersion} готова к установке</p>
        </div>
        
        <div class="warning">
          <strong>⚠️ Важно:</strong> Перед установкой обновления сохраните настройки прокси, так как они могут быть сброшены.
        </div>
        
        <h2>Инструкция по установке:</h2>
        
        <div class="step">
          <span class="step-number">1</span>
          <strong>Скачайте файл обновления</strong><br>
          <a href="${updateInfo.releaseUrl}" class="button" target="_blank">Скачать chrome-proxy-manager.zip</a>
        </div>
        
        <div class="step">
          <span class="step-number">2</span>
          <strong>Распакуйте архив</strong><br>
          Извлеките содержимое zip-файла в новую папку
        </div>
        
        <div class="step">
          <span class="step-number">3</span>
          <strong>Откройте страницу расширений</strong><br>
          Перейдите в Chrome по адресу: <code>chrome://extensions/</code>
        </div>
        
        <div class="step">
          <span class="step-number">4</span>
          <strong>Удалите старую версию</strong><br>
          Найдите Chrome Proxy Manager и нажмите "Удалить"
        </div>
        
        <div class="step">
          <span class="step-number">5</span>
          <strong>Установите новую версию</strong><br>
          Включите "Режим разработчика" → "Загрузить распакованное расширение" → выберите папку с новой версией
        </div>
        
        <div class="step">
          <span class="step-number">6</span>
          <strong>Восстановите настройки</strong><br>
          Настройте прокси серверы заново или импортируйте сохраненные настройки
        </div>
        
        <p><strong>После установки обновления эта страница закроется автоматически.</strong></p>
        
        <script>
          // Auto-close after 5 minutes
          setTimeout(() => window.close(), 300000);
        </script>
      </body>
      </html>
    `;

    // Create blob URL and open in new tab
    const blob = new Blob([instructionsHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    chrome.tabs.create({ url: url });
  }

  async checkExtensionUpdate() {
    const currentVersion = chrome.runtime.getManifest().version;
    const lastVersion = this.state.lastExtensionVersion;
    
    // If this is the first run or version has changed
    if (!lastVersion || lastVersion !== currentVersion) {
      console.log(`Extension updated from ${lastVersion || 'new install'} to ${currentVersion}`);
      
      // Perform migrations if needed
      await this.migrateSettings(lastVersion, currentVersion);
      
      // Update the stored version
      this.state.lastExtensionVersion = currentVersion;
      await this.saveState();
      
      console.log('Settings migration completed successfully');
    }
  }

  async migrateSettings(fromVersion, toVersion) {
    console.log(`Migrating settings from ${fromVersion || 'new install'} to ${toVersion}`);
    
    try {
      // Migration for new installations
      if (!fromVersion) {
        console.log('New installation detected, using default settings');
        return;
      }
      
      // Migration from versions before 1.0.1
      if (this.compareVersions(fromVersion, '1.0.1') < 0) {
        await this.migrateToV101();
      }
      
      // Add future migrations here
      // if (this.compareVersions(fromVersion, '1.1.0') < 0) {
      //   await this.migrateToV110();
      // }
      
    } catch (error) {
      console.error('Error during settings migration:', error);
      // Don't throw error to prevent extension from breaking
      // Just log the error and continue with current settings
    }
  }

  async migrateToV101() {
    console.log('Migrating to v1.0.1...');
    
    // Ensure new update settings exist
    if (!this.state.updateSettings.maxRetries) {
      this.state.updateSettings.maxRetries = 5;
    }
    
    if (!this.state.updateSettings.retryDelay) {
      this.state.updateSettings.retryDelay = 5000;
    }
    
    if (!this.state.updateSettings.currentRetries) {
      this.state.updateSettings.currentRetries = 0;
    }
    
    // Update check interval to 1 hour if it was 24 hours
    if (this.state.updateSettings.checkInterval === 24 * 60 * 60 * 1000) {
      this.state.updateSettings.checkInterval = 60 * 60 * 1000;
      console.log('Updated check interval from 24 hours to 1 hour');
    }
    
    // Ensure settings version is set
    this.state.settingsVersion = '0.0.1';
    
    console.log('Migration to v1.0.1 completed');
  }

  mergeWithDefaults(loadedState) {
    // Create a deep copy of default state
    const defaultState = {
      enabled: false,
      dnsEnabled: false,
      servers: [],
      activeServerId: null,
      updateSettings: {
        autoCheck: true,
        autoInstall: false,
        lastCheck: null,
        checkInterval: 60 * 60 * 1000,
        updateUrl: 'https://api.github.com/repos/kalkalch/chromeproxy/releases/latest',
        maxRetries: 5,
        retryDelay: 5000,
        currentRetries: 0
      },
      settingsVersion: '0.0.1',
      lastExtensionVersion: null
    };
    
    // Recursively merge loaded state with defaults
    return this.deepMerge(defaultState, loadedState);
  }

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  async handleInstallEvent(details) {
    console.log('Extension install event:', details);
    
    switch (details.reason) {
      case 'install':
        console.log('Extension installed for the first time');
        // First time installation - settings are already at defaults
        break;
        
      case 'update':
        console.log(`Extension updated from ${details.previousVersion} to ${chrome.runtime.getManifest().version}`);
        // Force migration check on update
        await this.checkExtensionUpdate();
        break;
        
      case 'chrome_update':
        console.log('Chrome browser was updated');
        // No action needed for browser updates
        break;
        
      default:
        console.log('Unknown install reason:', details.reason);
    }
  }

  async testProxyServer(server) {
    try {
      console.log('Testing proxy server:', server);
      
      const startTime = Date.now();
      
      // Save current proxy settings to restore later
      const originalSettings = await this.getCurrentProxySettings();
      
      // Test direct connectivity to the proxy port
      const connectTest = await this.testProxyConnectivity(server.host, server.port);
      const responseTime = Date.now() - startTime;
      
      // Restore original proxy settings after test
      try {
        if (originalSettings && originalSettings.value) {
          await new Promise((resolve, reject) => {
            chrome.proxy.settings.set({
              value: originalSettings.value,
              scope: 'regular'
            }, () => {
              if (chrome.runtime.lastError) {
                console.error('Error restoring proxy settings:', chrome.runtime.lastError);
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }
              console.log('Original proxy settings restored after test');
              resolve();
            });
          });
        } else {
          // Clear proxy settings if no original settings
          await this.clearProxySettings();
        }
      } catch (restoreError) {
        console.error('Failed to restore original proxy settings:', restoreError);
        // Continue anyway, don't fail the test because of restore issues
      }
      
      if (connectTest.success) {
        return {
          success: true,
          result: {
            success: true,
            responseTime: responseTime,
            status: 'reachable',
            message: connectTest.message || 'Прокси сервер работает и отвечает на запросы',
            proxyIp: connectTest.proxyIp,
            originalIp: connectTest.originalIp,
            ipChanged: connectTest.ipChanged
          }
        };
      } else {
        return {
          success: true,
          result: {
            success: false,
            responseTime: responseTime,
            status: 'unreachable',
            error: connectTest.error,
            message: 'Прокси сервер недоступен или не отвечает'
          }
        };
      }
    } catch (error) {
      console.error('Error testing proxy server:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testProxyConnectivity(host, port) {
    return new Promise(async (resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: 'Connection timeout'
        });
      }, 10000); // Увеличиваем таймаут для более точной проверки

      try {
        // Step 1: Get current IP without proxy
        let originalIp = null;
        try {
          const directResponse = await fetch('https://api.ipify.org?format=json', {
            method: 'GET',
            cache: 'no-cache'
          });
          if (directResponse.ok) {
            const directData = await directResponse.json();
            originalIp = directData.ip;
            console.log('Original IP (without proxy):', originalIp);
          }
        } catch (error) {
          console.log('Could not get original IP:', error.message);
        }

        // Step 2: Test proxy connection
        const testUrl = 'https://api.ipify.org?format=json'; // Service that returns public IP
        
        // Create a temporary proxy configuration for testing
        const testConfig = {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: 'http',
              host: host,
              port: parseInt(port)
            }
          }
        };

        // Apply test proxy settings temporarily
        chrome.proxy.settings.set({
          value: testConfig,
          scope: 'regular'
        }, async () => {
          if (chrome.runtime.lastError) {
            clearTimeout(timeoutId);
            resolve({
              success: false,
              error: 'Failed to apply test proxy settings'
            });
            return;
          }

          try {
            // Wait a bit for proxy settings to take effect
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Make a test request through the proxy
            const response = await fetch(testUrl, {
              method: 'GET',
              cache: 'no-cache'
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const data = await response.json();
              const proxyIp = data.ip;
              
              console.log('IP through proxy:', proxyIp);
              console.log('Original IP:', originalIp);

              // Check if IP changed (traffic goes through proxy)
              const ipChanged = originalIp && proxyIp !== originalIp;
              
              resolve({ 
                success: true,
                proxyIp: proxyIp,
                originalIp: originalIp,
                ipChanged: ipChanged,
                message: ipChanged ? 
                  `Трафик идет через прокси. IP изменился с ${originalIp} на ${proxyIp}` :
                  originalIp ? 
                    `Внимание: IP не изменился (${proxyIp}). Возможно, трафик не идет через прокси` :
                    `Получен IP через прокси: ${proxyIp}`
              });
            } else {
              resolve({
                success: false,
                error: `HTTP ${response.status}: ${response.statusText}`
              });
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            
            // Check if it's a network error (proxy might be down)
            if (fetchError.message.includes('Failed to fetch') || 
                fetchError.message.includes('NetworkError')) {
              resolve({
                success: false,
                error: 'Proxy server not responding'
              });
            } else {
              // Other errors might indicate proxy is there but has issues
              resolve({
                success: false,
                error: fetchError.message
              });
            }
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: `Connection error: ${error.message}`
        });
      }
    });
  }
}

// Initialize proxy manager
const proxyManager = new ProxyManager(); 
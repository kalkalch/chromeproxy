# Chrome Proxy Manager

A modern Chrome extension for managing proxy servers with automatic updates, DNS routing, and a beautiful user interface.

[🇷🇺 Русская версия](README.ru.md)

## Features

### 🚀 Core Functionality
- **Proxy Server Management**: Add, edit, and delete proxy servers
- **Protocol Support**: HTTP/HTTPS
- **One-Click Toggle**: Enable/disable proxy with a single click
- **Server Selection**: Quick switching between configured servers

### 🌐 Advanced Features
- **DNS through Proxy**: Optional routing of DNS queries through proxy (disabled by default for performance)
- **Exclude Lists**: Configure domains and IPs that bypass the proxy
- **Auto-Updates**: Automatic checking for extension updates via GitHub API
- **Smart Retry System**: Exponential backoff retry mechanism for failed update checks
- **Settings Migration**: Automatic migration of settings during extension updates

## Installation

### From Source

1. **Clone the repository**:
   ```bash
   git clone https://github.com/kalkalch/chromeproxy.git
   cd chromeproxy
   ```

2. **Install dependencies** (if needed):
   ```bash
   make install-deps
   ```

3. **Build the extension**:
   ```bash
   make build
   ```

4. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `build/` folder

### From Release

1. Download the latest release from [GitHub Releases](https://github.com/kalkalch/chromeproxy/releases)
2. Extract the ZIP file
3. Load the extracted folder in Chrome as described above

## Usage

### Basic Setup

1. **Click the extension icon** in the Chrome toolbar
2. **Add a proxy server**:
   - Click the "+" button
   - Enter server details (name, type, host, port)
   - Optionally add exclude list (domains/IPs to bypass proxy)
   - Click "Save"

3. **Enable proxy**:
   - Toggle the main switch to enable proxy
   - The extension will automatically use the selected server

### Server Management

- **Edit Server**: Click the edit icon next to any server
- **Delete Server**: Click the delete icon (trash can)
- **Switch Servers**: Click on any server to make it active

### Advanced Options

#### DNS through Proxy
- **Location**: Settings section in popup
- **Default**: Disabled (recommended for better performance)
- **When to enable**: Only if you need DNS queries routed through proxy
- **Warning**: May slow down browsing experience

#### Exclude Lists
Configure domains and IP addresses that should bypass the proxy:
```
example.com
*.google.com
192.168.1.0/24
localhost
```

### Auto-Updates

The extension automatically checks for updates every hour. You can:
- **Manual Check**: Click "Check for Updates" button
- **Toggle Auto-Check**: Enable/disable automatic checking
- **View Status**: See last check time and current version

## Development

### Build System

The project uses a Makefile for build automation:

```bash
# Build the extension
make build

# Clean build artifacts
make clean

# Generate icons from SVG
make icons

# Create distribution package
make package

# Create GitHub release
make release

# Install Python dependencies
make install-deps

# Validate manifest
make validate

# Show help
make help
``` 
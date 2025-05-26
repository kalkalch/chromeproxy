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

### 🎨 User Interface
- **Modern Design**: Beautiful gradient-based popup interface
- **Version Display**: Current version shown in header
- **Real-time Status**: Live proxy status indicators
- **Responsive Layout**: Optimized for different screen sizes

### 🔧 Technical Features
- **Manifest V3**: Built with the latest Chrome extension standards
- **Service Worker**: Efficient background processing
- **Sync Storage**: Settings synchronized across devices
- **Backup & Recovery**: Automatic backup creation and restoration
- **Error Handling**: Comprehensive error handling with user-friendly messages

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

### Project Structure

```
chromeproxy/
├── background.js          # Service worker (proxy management)
├── popup.html             # Extension popup interface
├── popup.js               # Popup logic and UI handling
├── popup.css              # Styles and animations
├── manifest.json          # Extension manifest
├── icons/                 # Icon files
│   ├── icon.svg           # Source SVG icon
│   ├── icon16.png         # 16x16 icon
│   ├── icon32.png         # 32x32 icon
│   ├── icon48.png         # 48x48 icon
│   └── icon128.png        # 128x128 icon
├── build/                 # Build output directory
├── .github/workflows/     # GitHub Actions CI/CD
├── Makefile              # Build automation
├── create_icons.py       # Icon generation script
└── README.md             # This file
```

### GitHub Actions

The project includes automated CI/CD:
- **Build Trigger**: Push to master branch (excluding docs/config changes)
- **Artifact Creation**: Builds are stored for 30 days
- **Auto-Release**: Creates releases for version tags (v*)
- **Release Assets**: Automatically attaches ZIP files to releases

### API Integration

#### GitHub API
- **Endpoint**: `https://api.github.com/repos/kalkalch/chromeproxy/releases/latest`
- **Rate Limits**: 60 requests per hour for unauthenticated requests
- **Headers**: Includes User-Agent for better rate limiting
- **Error Handling**: Smart retry with exponential backoff

## Configuration

### Proxy Types

| Type | Description | Use Case |
|------|-------------|----------|
| HTTP/HTTPS | Combined HTTP and HTTPS proxy | Web browsing, API calls |

### Settings Storage

Settings are stored in Chrome's sync storage and include:
- **Proxy servers**: List of configured servers
- **Active server**: Currently selected server ID
- **Proxy state**: Enabled/disabled status
- **DNS settings**: DNS through proxy preference
- **Update settings**: Auto-check preferences and timing
- **Version tracking**: For migration purposes

### Migration System

The extension includes automatic settings migration:
- **Version Tracking**: Detects extension updates
- **Backward Compatibility**: Preserves existing settings
- **Default Merging**: Adds new settings with defaults
- **Backup Creation**: Creates backups before migrations

## Troubleshooting

### Common Issues

#### Proxy Not Working
1. Check if the proxy server is accessible
2. Verify server credentials (if required)
3. Check exclude list for conflicting entries
4. Try disabling DNS through proxy

#### Update Check Failures
- **Rate Limiting**: Wait an hour if you see rate limit errors
- **Network Issues**: Check internet connection
- **GitHub Downtime**: Try again later

#### Settings Lost After Update
- The extension should automatically migrate settings
- Check Chrome's sync status
- Try disabling and re-enabling the extension

### Debug Information

Enable Chrome DevTools for the extension:
1. Go to `chrome://extensions/`
2. Find "Chrome Proxy Manager"
3. Click "Inspect views: service worker"
4. Check console for error messages

## Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style

- **Comments**: Always in English
- **Variables**: Use camelCase
- **Functions**: Descriptive names
- **Error Handling**: Always include try-catch blocks
- **Logging**: Use console.log for debugging

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes and version history.

## Support

- **Issues**: [GitHub Issues](https://github.com/kalkalch/chromeproxy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kalkalch/chromeproxy/discussions)

## License

This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).

## Acknowledgments

- Chrome Extension APIs documentation
- GitHub API for update checking
- Community feedback and contributions 
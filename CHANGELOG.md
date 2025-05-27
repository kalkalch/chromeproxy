# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2024-12-27

### Fixed
- **Critical**: Fixed Chrome Proxy API configuration format using `singleProxy` instead of separate protocol configs
- **Critical**: Resolved "Invalid invocation" error when applying proxy settings
- Improved proxy diagnostics to properly test connection through proxy server
- Enhanced proxy testing with direct IP comparison for accurate results
- Fixed connection reliability issues with better error handling and retry mechanisms

### Changed
- Improved individual server diagnostics with more accurate proxy detection
- Enhanced diagnostic results display with direct IP comparison
- Increased diagnostic timeout to 15 seconds for better reliability
- Better error messages for proxy connection issues

### Technical
- Updated Chrome Proxy API usage to follow Manifest V3 best practices
- Added `tabs` permission for diagnostic functionality
- Improved background script message handling with proper error recovery

## [0.1.2] - 2024-12-27

### Added
- Individual server diagnostics with 🔍 button for each proxy server
- Connection testing with response time measurement
- Real IP detection through proxy
- Comprehensive error handling for connection issues
- Automatic retry mechanism for background script communication
- Connection error recovery with reload functionality

### Changed
- Removed global diagnostics button in favor of per-server diagnostics
- Improved server list layout with dedicated diagnostics button
- Enhanced error messages with user-friendly descriptions
- Better visual feedback during diagnostic operations

### Fixed
- "Could not establish connection. Receiving end does not exist" error
- Background script communication reliability issues
- Extension context validation on popup initialization
- Proper error handling for all proxy operations
- Toggle state reversion on operation failures

### Technical
- Added `sendMessageWithRetry` method with exponential backoff
- Improved message handling in background script
- Enhanced extension lifecycle management
- Better error recovery mechanisms

## [0.1.1] - 2024-12-19

### Fixed
- **Proxy Connection**: Fixed proxy settings to work properly for all protocols (HTTP/HTTPS/FTP)
- **DNS Handling**: Added fallbackToDirect option for better DNS resolution when DNS through proxy is disabled
- **GitHub Releases**: Fixed changelog extraction for automatic release notes generation

### Added
- **Proxy Diagnostics**: Added diagnostics button (🔍) to check current proxy settings
- **Debug Functionality**: Enhanced logging and verification of applied proxy settings

### Changed
- **Release Process**: Improved GitHub Actions workflow to automatically extract changelog content
- **Release Notes**: Enhanced release notes format with proper changelog information and emojis

## [0.1.0] - 2024-12-19

### Added
- **Repository Link**: Added home/repository link (🏠 icon) in extension header
- **Language Switcher**: Russian (🇷🇺) and English (🇺🇸) language options
- **Internationalization**: Comprehensive localization system for all UI elements
- **Language Persistence**: Language preference saved in chrome.storage.sync
- **Dynamic Translation**: Real-time text updates when language is changed

### Changed
- **Documentation**: Translated CHANGELOG.md from Russian to English
- **Documentation Cleanup**: Removed unnecessary sections from README files
- **UI Enhancement**: Improved header layout with language controls

## [0.0.1] - 2024-12-19

### Added
- **Proxy Server Management**: Add, edit, and delete proxy servers
- **Protocol Support**: HTTP/HTTPS
- **One-Click Toggle**: Enable/disable proxy with a single click
- **Server Selection**: Quick switching between configured servers
- **DNS through Proxy**: Optional routing of DNS queries through proxy
- **Exclude Lists**: Configure domains and IPs that bypass the proxy
- **Update System**: Automatic checking for extension updates via GitHub API
- **Notifications**: Chrome notifications about available updates
- **Modern Interface**: Beautiful and user-friendly popup with gradient design
- **Version Display**: Show current version in extension header

### Build System
- **Makefile**: Automated build with commands: build, clean, package, release
- **GitHub Actions**: CI/CD pipeline for automatic builds and release creation
- **Icon Generation**: Automatic creation of icons in different sizes from SVG

### Technical
- Chrome Extension Manifest V3 implementation
- Settings storage in chrome.storage.sync
- Service Worker for background operations
- Semantic version comparison
- Exponential backoff retry system for API errors
- Automatic settings migration during updates
- Backup and recovery system

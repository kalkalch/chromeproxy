# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2024-12-27

### Added
- **Proxy Authentication Support**: Optional username and password fields for each proxy server
- **PAC Script Implementation**: Automatic authentication using PAC (Proxy Auto-Configuration) scripts
- **Authentication Indicator**: 🔐 icon displayed next to servers with configured authentication
- **Enhanced Diagnostics**: Shows authentication status in server diagnostics
- **Form Validation**: Proper handling of optional authentication fields

### Changed
- **Manifest V3 Compatibility**: Removed problematic webRequest blocking handlers
- **Authentication Method**: Switched from webRequest to PAC script approach for better reliability
- **User Experience**: Added informational notes about authentication behavior
- **Form Layout**: Improved authentication section with clear optional labeling

### Fixed
- **ERR_PROXY_CONNECTION_FAILED**: Resolved proxy connection failures for authenticated servers
- **Background Script Stability**: Eliminated "Receiving end does not exist" errors
- **Chrome Compatibility**: Full compliance with Manifest V3 requirements
- **Authentication Flow**: Automatic credential handling without manual prompts

### Technical
- Implemented PAC script generation with embedded credentials
- Enhanced proxy configuration logic for authenticated vs non-authenticated servers
- Improved error handling and logging for authentication scenarios
- Updated form validation to handle optional authentication fields
- Added comprehensive localization for all authentication-related UI elements

## [0.2.0] - 2024-12-27

### Added
- **Enhanced Proxy Diagnostics**: Real IP detection and traffic verification to confirm proxy is working
- **IP Comparison**: Shows original IP vs proxy IP to verify traffic routing
- **Comprehensive Localization**: Full English and Russian language support for all UI elements
- **Form Validation**: Proper error messages with localization support
- **Development Guidelines**: Added .cursorrules file with comprehensive project guidelines

### Changed
- **Default Language**: English is now the default language (was Russian)
- **Main Title**: Updated from "Proxy Manager" to "Chrome Proxy Manager"
- **Simplified Server Form**: Removed proxy type selection (always HTTP/HTTPS)
- **Enhanced Diagnostics**: Improved proxy testing with actual traffic verification
- **Better Error Handling**: All error messages now properly localized
- **Documentation**: Synchronized README.md and README.ru.md, removed unnecessary sections

### Fixed
- **Localization Issues**: Fixed untranslated text in server form headers
- **Diagnostic Accuracy**: Proxy diagnostics now correctly detect if traffic goes through proxy
- **Form Translations**: All validation messages and form elements properly translated
- **Connection Error Messages**: Improved error handling with localized messages

### Technical
- Enhanced proxy testing with real HTTP requests through proxy
- Improved IP detection using external services
- Better timeout handling for diagnostic operations (increased to 10 seconds)
- Comprehensive translation system for all user-facing text
- Streamlined build process and documentation

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

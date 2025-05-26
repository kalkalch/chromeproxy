# Chrome Proxy Manager - Build System
# Автоматизация сборки расширения для Chrome

# Variables
EXTENSION_NAME = chrome-proxy-manager
BUILD_DIR = build
PACKAGE_NAME = $(EXTENSION_NAME)-$(shell date +%Y%m%d-%H%M%S).zip
PYTHON = python3

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

# Default target
.PHONY: all
all: build

# Help target
.PHONY: help
help:
	@echo "$(BLUE)Chrome Proxy Manager - Build System$(NC)"
	@echo ""
	@echo "$(YELLOW)Available commands:$(NC)"
	@echo "  $(GREEN)make build$(NC)        - Full build (clean + icons + copy files)"
	@echo "  $(GREEN)make clean$(NC)        - Clean build directory"
	@echo "  $(GREEN)make icons$(NC)        - Generate extension icons"
	@echo "  $(GREEN)make copy$(NC)         - Copy source files to build directory"
	@echo "  $(GREEN)make validate$(NC)     - Validate extension files"
	@echo "  $(GREEN)make package$(NC)      - Create distribution package"
	@echo "  $(GREEN)make install-deps$(NC) - Install Python dependencies"
	@echo "  $(GREEN)make check-deps$(NC)   - Check system dependencies"
	@echo "  $(GREEN)make git-init$(NC)     - Initialize git repository"
	@echo "  $(GREEN)make release$(NC)      - Create release (build + package)"
	@echo "  $(GREEN)make help$(NC)         - Show this help"

# Check system dependencies
.PHONY: check-deps
check-deps:
	@echo "$(BLUE)Checking system dependencies...$(NC)"
	@command -v $(PYTHON) >/dev/null 2>&1 || { echo "$(RED)Error: Python 3 is required but not installed.$(NC)" >&2; exit 1; }
	@echo "$(GREEN)✓ Python 3 found$(NC)"
	@command -v zip >/dev/null 2>&1 || { echo "$(RED)Error: zip is required but not installed.$(NC)" >&2; exit 1; }
	@echo "$(GREEN)✓ zip found$(NC)"

# Install Python dependencies
.PHONY: install-deps
install-deps: check-deps
	@echo "$(BLUE)Installing Python dependencies...$(NC)"
	@$(PYTHON) -c "import PIL" 2>/dev/null || $(PYTHON) -m pip install Pillow
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

# Clean build directory
.PHONY: clean
clean:
	@echo "$(BLUE)Cleaning build directory...$(NC)"
	@rm -rf $(BUILD_DIR)
	@echo "$(GREEN)✓ Build directory cleaned$(NC)"

# Create build directory
$(BUILD_DIR):
	@echo "$(BLUE)Creating build directory...$(NC)"
	@mkdir -p $(BUILD_DIR)
	@mkdir -p $(BUILD_DIR)/icons

# Generate icons
.PHONY: icons
icons: $(BUILD_DIR) install-deps
	@echo "$(BLUE)Generating extension icons...$(NC)"
	@$(PYTHON) create_icons.py --output $(BUILD_DIR)/icons
	@echo "$(GREEN)✓ Icons generated$(NC)"

# Copy source files to build directory
.PHONY: copy
copy: $(BUILD_DIR)
	@echo "$(BLUE)Copying source files...$(NC)"
	@cp manifest.json $(BUILD_DIR)/
	@cp background.js $(BUILD_DIR)/
	@cp popup.html $(BUILD_DIR)/
	@cp popup.css $(BUILD_DIR)/
	@cp popup.js $(BUILD_DIR)/
	@echo "$(GREEN)✓ Source files copied$(NC)"

# Validate extension files
.PHONY: validate
validate: $(BUILD_DIR)
	@echo "$(BLUE)Validating extension files...$(NC)"
	@test -f $(BUILD_DIR)/manifest.json || { echo "$(RED)Error: manifest.json not found$(NC)"; exit 1; }
	@test -f $(BUILD_DIR)/background.js || { echo "$(RED)Error: background.js not found$(NC)"; exit 1; }
	@test -f $(BUILD_DIR)/popup.html || { echo "$(RED)Error: popup.html not found$(NC)"; exit 1; }
	@test -f $(BUILD_DIR)/popup.css || { echo "$(RED)Error: popup.css not found$(NC)"; exit 1; }
	@test -f $(BUILD_DIR)/popup.js || { echo "$(RED)Error: popup.js not found$(NC)"; exit 1; }
	@test -f $(BUILD_DIR)/icons/icon16.png || { echo "$(RED)Error: icon16.png not found$(NC)"; exit 1; }
	@test -f $(BUILD_DIR)/icons/icon32.png || { echo "$(RED)Error: icon32.png not found$(NC)"; exit 1; }
	@test -f $(BUILD_DIR)/icons/icon48.png || { echo "$(RED)Error: icon48.png not found$(NC)"; exit 1; }
	@test -f $(BUILD_DIR)/icons/icon128.png || { echo "$(RED)Error: icon128.png not found$(NC)"; exit 1; }
	@test -f $(BUILD_DIR)/icons/icon32-disabled.png || { echo "$(RED)Error: icon32-disabled.png not found$(NC)"; exit 1; }
	@echo "$(GREEN)✓ All files validated$(NC)"

# Full build
.PHONY: build
build: clean icons copy validate
	@echo "$(GREEN)✓ Build completed successfully!$(NC)"
	@echo "$(YELLOW)Extension built in: $(BUILD_DIR)/$(NC)"

# Create distribution package
.PHONY: package
package: build
	@echo "$(BLUE)Creating distribution package...$(NC)"
	@cd $(BUILD_DIR) && zip -r $(PACKAGE_NAME) .
	@echo "$(GREEN)✓ Package created: $(BUILD_DIR)/$(PACKAGE_NAME)$(NC)"

# Initialize git repository
.PHONY: git-init
git-init:
	@echo "$(BLUE)Initializing git repository...$(NC)"
	@git init 2>/dev/null || echo "$(YELLOW)Git repository already exists$(NC)"
	@git add .gitignore README.md Makefile *.js *.html *.css *.json *.py 2>/dev/null || true
	@git commit -m "Initial commit: Chrome Proxy Manager v1.0.0" 2>/dev/null || echo "$(YELLOW)No changes to commit$(NC)"
	@echo "$(GREEN)✓ Git repository initialized$(NC)"

# Create release
.PHONY: release
release: package
	@echo "$(GREEN)✓ Release created successfully!$(NC)"
	@echo "$(YELLOW)Package: $(BUILD_DIR)/$(PACKAGE_NAME)$(NC)"
	@echo "$(YELLOW)Build directory: $(BUILD_DIR)/$(NC)"
	@echo ""
	@echo "$(BLUE)To install the extension:$(NC)"
	@echo "1. Open Chrome and go to chrome://extensions/"
	@echo "2. Enable 'Developer mode'"
	@echo "3. Click 'Load unpacked' and select the $(BUILD_DIR)/ folder"
	@echo ""
	@echo "$(BLUE)Or install from package:$(NC)"
	@echo "1. Unzip $(BUILD_DIR)/$(PACKAGE_NAME)"
	@echo "2. Follow the steps above with the unzipped folder" 
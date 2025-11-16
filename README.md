# ARC Raiders Item Tracker

A desktop application for tracking game inventory items across expeditions, quests, scrappy runs, and workshop upgrades in ARC Raiders.

## Features

- 🖥️ **Native Desktop App**: Professional desktop application with native window controls
- 📋 **Tabbed Interface**: Organized views for different game activities
- 📖 **Wiki Reference**: Complete loot table with rarity, recycling, and usage info
- ✅ **Interactive Checkboxes**: Mark items as collected with visual feedback
- 🔍 **Search Functionality**: Find items quickly with project associations
- 📊 **Progress Tracking**: Visual progress bars and completion percentages
- 🎯 **Smart Grouping**: Items automatically grouped by requirements
- 🏭 **Workshop Stations**: Individual progress tracking for each station despite shared items
- 💾 **Offline Support**: Works without internet connection
- 🌙 **Dark/Light Mode**: Toggle between themes with preference saving
- 🎨 **Official Branding**: ARC Raiders theme with professional design

## Projects Supported

- **Expedition Project**: Multi-phase expedition items
- **Quest Items**: Story quest and side quest requirements
- **Scrappy Items**: Resource gathering and crafting materials
- **Workshop Items**: Station upgrades with individual progress tracking

## Installation

### Download
1. Download the latest release from the [releases page](https://github.com/your-repo/releases)
2. Extract the zip file to your desired location
3. Run the executable file for your platform:
   - Windows: `ARC Raiders Item Tracker.exe`
   - macOS: `ARC Raiders Item Tracker.app`
   - Linux: `arc-raiders-item-tracker`

### First Run
The application will open with all data pre-loaded. No additional setup required.

## How to Use

### Main Interface
- **All Items Combined**: Overview of everything needed with search functionality
- **Project Tabs**: Detailed tracking with collapsible groups for each project
- **Wiki Reference**: Complete item database with detailed information

### Tracking Items
- **Checkboxes**: Click to mark items as collected
- **Progress Bars**: Visual completion indicators
- **Search**: Type to find items and see which projects need them
- **Groups**: Click group headers to collapse/expand sections

### Workshop Stations
Each workshop station (Gear Bench, Utility Station, etc.) tracks progress independently, even when items are shared across multiple stations.

## Data Sources

- **ARC Raiders Wiki**: Comprehensive item information and requirements
- **Gamepur**: Quest item details and guides
- **MetaForge**: Item icons and database

## System Requirements

- **Windows**: 10 or later
- **macOS**: 10.13 or later
- **Linux**: Most modern distributions
- **Storage**: ~50MB for application and icons

## Troubleshooting

- **App won't start**: Ensure you have the complete application folder
- **Progress not saving**: Check that the application has write permissions
- **Icons not loading**: Ensure the `item-icons/` folder is present
- **Performance issues**: Close other applications to free up memory

## Development

### Prerequisites
- Node.js (v14 or higher)
- npm

### Local Development
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run production build
npm start

# Build for distribution
npm run build
```

### Creating Releases

The project features a fully automated release system with intelligent versioning.

#### 🚀 One-Command Automated Release (Recommended)
```bash
npm run push-release
```
This automatically:
- Analyzes your commit messages to determine version bump type
- Updates version numbers in `package.json` and memory banks
- Builds the application locally
- Creates a local distribution package
- Commits changes with proper versioning
- Creates and pushes a git tag
- Triggers GitHub Actions for cross-platform builds

**Version bump logic:**
- `patch` (1.0.0 → 1.0.1): Bug fixes and small changes
- `minor` (1.0.0 → 1.1.0): New features (commits starting with "feat")
- `major` (1.0.0 → 2.0.0): Breaking changes (commits with "breaking" or "!")

#### Manual Version Control
```bash
# Bump specific version type
npm run bump:patch    # 1.0.0 → 1.0.1
npm run bump:minor    # 1.0.0 → 1.1.0
npm run bump:major    # 1.0.0 → 2.0.0

# Or use shorthand
npm run bump          # defaults to patch
```

#### Legacy Manual Release
```bash
# For local testing only
npm run release
```
This creates a local zip file with the Windows installer and readme.

### Release Files
Each release includes:
- **Windows**: `ARC Raiders Item Tracker Setup X.X.X.exe` (installer)
- **macOS**: `.dmg` disk image
- **Linux**: `.AppImage`, `.deb`, `.rpm`, `.snap` packages
- **README.md**: User documentation

## Support

For issues or questions:
- Check the [issues page](https://github.com/your-repo/issues) for known problems
- Review the developer documentation for technical details

## Updates

The application includes all current game data. Check the releases page for updates when new content is added to ARC Raiders.

---

**Happy gaming! 🎮** Track your items efficiently and focus on the adventure.

# ARC Raiders Item Tracker - Desktop App

This is the desktop version of the ARC Raiders Item Tracker, built with Electron. It provides a native desktop application experience for tracking game inventory items.

## Features

- **Native Desktop App**: Runs as a standalone application, not in a browser
- **Complete Item Tracking**: Track items across expeditions, quests, scrappy runs, and workshop upgrades
- **Offline Functionality**: All data stored locally, works without internet connection
- **Cross-Platform**: Available for Windows, macOS, and Linux
- **Comprehensive Database**: 500+ items with detailed information from MetaForge
- **Progress Tracking**: Visual progress bars and completion status
- **Search & Filter**: Find items quickly across all projects
- **State Persistence**: All settings and progress saved automatically
- **Dark Mode**: Toggle between light and dark themes with preference saving

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm

### Setup

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

#### Development Mode
```bash
npm run dev
```
This starts the app with developer tools open.

#### Production Mode
```bash
npm start
```
This starts the app in production mode.

## Building for Distribution

### Build for Current Platform
```bash
npm run build
```

### Build for Specific Platforms

#### Windows
```bash
npm run build:win
```

#### macOS
```bash
npm run build:mac
```

#### Linux
```bash
npm run build:linux
```

Built applications will be in the `dist/` folder.

## ✅ Conversion Complete

The ARC Raiders Item Tracker has been successfully converted to a standalone desktop application! 

- **Status**: ✅ Production Ready
- **Tested**: ✅ Runs as desktop app (not browser)
- **Built**: ✅ Windows installer created successfully
- **Functionality**: ✅ All original features preserved

### Quick Start

1. **Run in development**: `npm start`
2. **Build for distribution**: `npm run build:win` (or `build:mac`, `build:linux`)
3. **Install**: Run the generated installer from `dist/` folder

The app opens in a native window with proper desktop application behavior, including window controls, system menus, and external link handling.

## Project Structure

```
arc-shopping-list/
├── main.js                 # Electron main process
├── index.html             # Main application UI
├── app.js                 # Application logic
├── styles.css             # Styling
├── package.json           # Electron configuration
├── icons/                 # Item icons (500+ files)
├── expedition_project.json # Expedition item data
├── quest_items.json       # Quest item data
├── scrappy_items.json     # Scrappy item data
├── workshop_items.json    # Workshop item data
├── all_items.json         # Complete item database
└── memory-bank/           # Project documentation
```

## Data Files

The app uses several JSON data files:
- `expedition_project.json` - Expedition 1 requirements
- `quest_items.json` - Quest collectibles
- `scrappy_items.json` - Scrappy upgrade items
- `workshop_items.json` - Workshop station requirements
- `all_items.json` - Complete item database with metadata

## Technical Details

- **Framework**: Electron
- **UI**: Vanilla HTML/CSS/JavaScript
- **Storage**: LocalStorage (persisted in app data directory)
- **Icons**: 506 local item icons for offline use
- **Data**: JSON files loaded via Fetch API
- **Security**: Context isolation enabled, no Node integration in renderer

## Differences from Web Version

- Removed PWA manifest and service worker
- Native window controls and menus
- External links open in system browser
- Desktop-specific optimizations

## Contributing

This is a conversion of the existing web app to desktop. The core functionality remains the same. For data updates or feature requests, please refer to the original web version.

## License

MIT License - See package.json for details

## Credits

- **Data Sources**: ARC Raiders Wiki, Gamepur, MetaForge
- **Original Development**: ARC Raiders community
- **Desktop Conversion**: Electron framework

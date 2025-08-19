# Stream Orbs - HTML Files Overview

## Main Files

### `orbs.html` (Main Display Page)
- **Primary file for stream overlays and testing**
- Features a banner with image cycling and timer functionality
- Full orb management system with admin controls
- Toggle-able admin panels (gear button in bottom right)
- Banner admin console for image management
- Responsive design with modern UI

**Banner Features:**
- Upload multiple images for cycling
- Configurable timer (5-300 seconds)
- Start/stop/clear image cycle controls
- Real-time timer display
- Auto-advance through images

**Orb Features:**
- Add orbs from URLs or local files
- Multiple entry types (drop-in, toss-in)
- Role-based styling and icons
- Configurable colors, sizes, and effects
- Save/load orb configurations
- Soundboard integration

### `admin.html` (Standalone Admin Panel)
- Dedicated admin interface for orb management
- Works with shared.js for cross-page communication
- Grid-based layout for efficient orb editing
- Uses BroadcastChannel API for real-time sync

## Utility Files

### `debug-orbs.html`
- Simple debugging tool for localStorage orb data
- Add/view/clear test orbs
- Useful for troubleshooting orb persistence

### `simple-test.html`
- Basic orb animation test
- Minimal implementation for testing physics
- Good for performance debugging

### `sand-debug.html`
- Advanced physics debugging
- Sand-style collision detection
- Multiple orb interaction testing

## Legacy/Backup Files

### `orbs-legacy.html`
- Previous main orb implementation
- Kept for reference and rollback if needed
- Contains original admin panel design

## Shared Resources

### `shared.js`
- Common functionality for orb management
- BroadcastChannel communication system
- Shared between admin.html and stage pages

### `styles.css`
- Common styling (if used)

## Recommended Usage

1. **For streaming/OBS**: Use `orbs.html` as your browser source
2. **For administration**: Use the gear button in `orbs.html` or `admin.html`
3. **For testing**: Use `simple-test.html` or `debug-orbs.html`
4. **For debugging physics**: Use `sand-debug.html`

## Getting Started

1. Open `orbs.html` in your browser
2. Click the gear icon (⚙️) in the bottom right to open admin panels
3. Add banner images using the banner admin panel
4. Set timer and start image cycling
5. Add orbs using the orb admin panel
6. Hide admin panels for clean display

## Banner Image Cycling

The banner supports automatic image cycling with these features:
- **Multiple image upload**: Select multiple images at once
- **Configurable timer**: Set interval between 5-300 seconds
- **Visual timer**: Countdown display shows time remaining
- **Manual control**: Start, stop, and clear controls
- **Auto-advance**: Cycles through images automatically
- **Memory management**: Properly cleans up image URLs when removed

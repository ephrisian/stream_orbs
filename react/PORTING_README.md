# Stream Orbs React Application

This is the React/TypeScript/Material-UI version of the Stream Orbs application, ported from the `/second` vanilla JavaScript implementation. It provides a modern, portable desktop application using Electron with enhanced features.

## Features Ported

### ✨ Orb Management System
- **Physics Simulation**: Full bouncing physics with drop and toss entry animations
- **Customizable Orbs**: Image URL, label, role, icon, ring color, ring width, size
- **Role System**: None, Mod, Lurker, Passerby roles with visual indicators
- **Save/Load**: Persistent storage in localStorage
- **Real-time Animation**: 60fps canvas animation with smooth movements

### 🎧 Advanced Soundboard
- **File Upload Support**: Upload local audio files (MP3, WAV, OGG, AAC, M4A, WEBM)
- **GIF Integration**: Upload and display GIF animations with sound triggers
- **Keyboard Shortcuts**: Customizable key combinations (Ctrl+Alt+Key, etc.)
- **Volume Control**: Individual volume sliders for each sound
- **GIF Positioning**: 5 position options (top-left, top-right, bottom-left, bottom-right, center)
- **Conflict Detection**: Warns when key combinations are already in use
- **Preview System**: Test sounds and GIFs before going live

### 🎨 Visual Enhancements
- **Material-UI Design**: Modern, responsive interface
- **Background Color Picker**: Customizable canvas background
- **Responsive Layout**: Adapts to different screen sizes
- **Real-time Updates**: Changes reflect immediately on canvas

## Application Structure

### Pages
- `/admin` - Main control panel with soundboard and orb management
- `/obs` - Clean canvas view for OBS/streaming with hover controls
- `/sound` - Dedicated soundboard page

### OBS Integration Features
- **Clean View**: Fullscreen canvas without navigation clutter
- **Auto-hiding Controls**: Controls fade out after 3 seconds, appear on mouse movement
- **Copy URL**: One-click copy of OBS URL to clipboard for easy sharing
- **New Tab**: Open OBS view in separate tab/window for OBS Browser Source
- **Real-time Sync**: Automatically syncs orbs and background changes from admin page
- **Keyboard Shortcuts**: Sound triggers work in OBS view for live interaction

### Core Components
- `Canvas` - Physics-enabled orb animation canvas
- `OrbAdmin` - Comprehensive orb management interface
- `Soundboard` - Advanced sound trigger management
- `useOrbManager` - Custom hook for orb physics and state
- `useSoundManager` - Custom hook for sound/GIF system

## Key Improvements Over Original

1. **TypeScript Safety**: Full type definitions for orbs and sound triggers
2. **React Hooks**: Modern state management and lifecycle handling
3. **Material-UI**: Professional, accessible UI components
4. **File Upload**: Direct file upload instead of URL-only
5. **Better Error Handling**: Comprehensive error states and user feedback
6. **Real-time Sync**: OBS page automatically syncs with admin changes
7. **Responsive Design**: Works on mobile and desktop
8. **Electron Ready**: Portable desktop application support
9. **OBS Integration**: Purpose-built streaming view with copy/new tab functionality
10. **Auto-hiding UI**: Clean streaming experience with accessible controls

## Running the Application

### Development
```bash
cd react
npm run dev
```

### Electron Desktop App
```bash
cd react
npm run build
npm run electron
```

## Technical Implementation

### Orb Physics System
The orb system uses a custom React hook (`useOrbManager`) that manages:
- Canvas rendering and animation loops
- Physics calculations (gravity, bouncing, movement patterns)
- Image loading and error handling
- Collision detection with canvas boundaries
- Smooth shrinking animations after landing

### Sound System Architecture
The sound system (`useSoundManager`) provides:
- File-based audio management with object URLs
- Keyboard event capture and parsing
- GIF overlay positioning system
- Audio context management for better performance
- LocalStorage persistence for settings

### State Management
- React hooks for component-level state
- LocalStorage for persistence
- Real-time synchronization between admin and OBS views
- Type-safe state updates with TypeScript

## Migration Notes

All features from the `/second` application have been successfully ported:
- ✅ Canvas physics and animation
- ✅ Orb management and customization
- ✅ Sound triggers with keyboard shortcuts
- ✅ GIF overlay system
- ✅ File upload support
- ✅ Save/load functionality
- ✅ Background color customization
- ✅ Role-based orb styling

The React version provides the same functionality with enhanced UX, better error handling, and modern development practices.

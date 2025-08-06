# Stream Orbs

A React + Electron app for managing interactive orbs in streaming applications, with full OBS Browser Source compatibility.

## Features

- 🎨 **Admin Interface**: Add, edit, and manage orbs with custom images, roles, and effects
- 🔴 **OBS Integration**: Clean OBS Browser Source view with real-time orb animations
- 🗄️ **Database Sync**: Server-side storage for cross-device and OBS compatibility
- 🖥️ **Desktop App**: Electron wrapper for standalone desktop usage
- 🎵 **Soundboard**: Integrated sound effects and triggers
- 🌈 **Customizable**: Role-based colors, sizes, and animations

## Quick Start

### Option 1: Web Development Mode

1. **Start the API server:**
   ```bash
   cd server
   npm install
   node server.js
   ```

2. **Start the React dev server:**
   ```bash
   cd react
   npm install
   npm run dev
   ```

3. **Access the app:**
   - Admin: http://localhost:5173/
   - OBS View: http://localhost:5173/obs

### Option 2: Electron Desktop App

1. **Start the API server:**
   ```bash
   cd server
   npm install
   node server.js
   ```

2. **Start Electron in development:**
   ```bash
   cd react
   npm install
   npm run dev        # In one terminal
   npm run electron:dev   # In another terminal
   ```

## Project Structure

```
stream_orbs/
├── react/                 # React + Electron frontend
│   ├── src/
│   │   ├── components/    # UI components (OrbAdmin, Soundboard, etc.)
│   │   ├── hooks/         # Custom hooks (useOrbManager, useOrbApi, etc.)
│   │   ├── pages/         # Page components (AdminPage, ObsPage, etc.)
│   │   └── types/         # TypeScript type definitions
│   ├── electron/          # Electron main process files
│   └── public/            # Static assets and OBS test page
├── server/                # Express.js API server
│   ├── data/             # JSON database storage
│   └── server.js         # API server with CRUD operations
└── Legacy files...       # Original vanilla JS implementation
```

## API Endpoints

The server provides a REST API for orb management:

- `GET /api/orbs` - Get all orbs
- `POST /api/orbs` - Replace all orbs
- `PUT /api/orbs/:id` - Update specific orb  
- `DELETE /api/orbs/:id` - Delete specific orb
- `DELETE /api/orbs` - Clear all orbs
- `GET /health` - Server health check

## OBS Browser Source Setup

1. Add a **Browser Source** in OBS
2. Set URL to: `http://localhost:5173/obs`
3. Set Width: `405` Height: `720` (or your preferred canvas size)
4. Check "Shutdown source when not visible" for better performance
5. Orbs will automatically sync with the admin interface

## Development

### Technologies Used

- **Frontend**: React 19, TypeScript, Material-UI 7, Vite
- **Desktop**: Electron 37
- **Backend**: Express.js, Node.js
- **Database**: JSON file storage
- **Canvas**: HTML5 Canvas for orb animations

### Key Features

- **Real-time sync** between admin and OBS views
- **Persistent storage** with API server database
- **Fallback mechanism** to localStorage if API unavailable
- **OBS-optimized animations** with setInterval fallback
- **Cross-platform desktop app** with Electron

## Troubleshooting

### Common Issues

1. **Orbs not showing in OBS**: Ensure API server is running on port 3001
2. **Electron not starting**: Check that you're using the ES module syntax
3. **CORS errors**: Make sure the API server has CORS enabled (it does by default)
4. **Port conflicts**: API server uses 3001, React dev uses 5173 (or next available)

### Development Tips

- Use browser DevTools for debugging the React app
- Check browser console for API errors
- Server logs show API request activity
- Electron DevTools are enabled in development mode

## License

MIT License - feel free to use and modify for your streaming setup!

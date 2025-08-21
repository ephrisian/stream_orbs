# Stream Orbs - Electron App Setup

Stream Orbs is now fully configured as an Electron desktop application with the following features:

## 🚀 **Electron App Features**

### **Architecture**
- **Frontend**: React 19 + TypeScript + Material-UI + Vite
- **Backend**: Express.js API server (auto-started with Electron)
- **Desktop**: Electron wrapper with proper window management
- **Router**: HashRouter for Electron compatibility (instead of BrowserRouter)

### **Key Improvements Made**

1. **Centralized API Configuration** (`src/config/api.ts`)
   - Dynamic API URLs for development/production
   - Electron-aware URL resolution
   - Server health checking capabilities

2. **Enhanced Electron Main Process** (`electron/main.js`)
   - Auto-starts Express server when app launches
   - Proper server cleanup on app exit
   - Larger window size (1200x800) for better UX
   - Security configurations for local development

3. **Router Compatibility**
   - Switched from BrowserRouter to HashRouter
   - Proper navigation handling in Electron environment

4. **Build Configuration**
   - electron-builder configuration for packaging
   - Multiple target platforms (Windows, macOS, Linux)
   - Proper file inclusion for distribution

## 📦 **Installation & Setup**

### **Install Dependencies**
```bash
cd react
npm install
```

### **Development Mode**
```bash
# Start both Vite dev server and Electron app
npm run electron:start
```

This command will:
1. Start the Vite development server on `http://localhost:5173`
2. Wait for the server to be ready
3. Launch Electron with the Express API server
4. Open DevTools for debugging

### **Production Build**
```bash
# Build React app for production
npm run build

# Test production build in Electron
npm run electron

# Package for distribution
npm run dist
```

## 🖥️ **Usage**

### **Development Workflow**
1. Run `npm run electron:start` from the `react` directory
2. The Electron app will open with:
   - Main admin interface at `/#/admin`
   - OBS view accessible via navigation or `/#/obs`
   - Express API server running automatically

### **Features Available**
- ✅ **Banner Control**: Upload and manage banner images
- ✅ **Orb Management**: Create and animate orbs
- ✅ **Soundboard**: Audio triggers with GIF overlays
- ✅ **Game Modes**: Pachinko, Snake, Duck Race
- ✅ **OBS Integration**: Clean OBS browser source view

### **File Structure**
```
react/
├── electron/
│   ├── main.js          # Electron main process
│   └── preload.js       # Preload script
├── src/
│   ├── config/
│   │   └── api.ts       # Centralized API configuration
│   ├── components/      # React components
│   ├── pages/           # Admin and OBS pages
│   └── App.tsx          # Main app with HashRouter
├── dist/                # Built React app
├── dist-electron/       # Packaged Electron app
└── package.json         # Electron + React dependencies
```

## 🔧 **Configuration**

### **API Configuration**
The app automatically detects the environment:
- **Development**: Uses `http://localhost:3001`
- **Electron Production**: Uses `http://localhost:3001`
- **Web Production**: Configurable base URL

### **Electron Window**
- **Size**: 1200x800 (optimized for admin interface)
- **Security**: Local resource access enabled
- **DevTools**: Auto-opens in development mode

### **Server Management**
- Express server auto-starts with Electron
- Graceful shutdown when app closes
- Health checking for API availability

## 📋 **Scripts Reference**

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server only |
| `npm run electron:dev` | Start Electron with dev server |
| `npm run electron:start` | Full development setup (recommended) |
| `npm run build` | Build React app for production |
| `npm run electron` | Run Electron with built app |
| `npm run pack` | Package without creating installer |
| `npm run dist` | Create distributable packages |

## 🚨 **Known Requirements**

1. **Node.js**: Version 16+ required
2. **Operating System**: Windows, macOS, or Linux
3. **Port Availability**: 3001 (API), 5173 (dev server)
4. **File Permissions**: Read/write access for uploads directory

## 🔍 **Troubleshooting**

### **Server Not Starting**
- Check if port 3001 is available
- Ensure server directory exists relative to Electron app
- Check console for server startup errors

### **Images Not Loading**
- Verify Express server is running on port 3001
- Check uploads directory permissions
- Ensure API endpoints are accessible

### **Build Issues**
- Run `npm run build` before `npm run electron`
- Clear node_modules and reinstall if needed
- Check for TypeScript compilation errors

## ✅ **Ready for Production**

The app is now fully configured as an Electron desktop application with:
- ✅ Auto-starting backend server
- ✅ Proper routing for Electron
- ✅ Centralized API management
- ✅ Build and packaging configuration
- ✅ Cross-platform compatibility

You can now distribute the app as a desktop application using `npm run dist`!

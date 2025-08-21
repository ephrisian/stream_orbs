import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let serverProcess = null;

function startServer() {
  // In production, we'll need to bundle the server or run it differently
  // For now, this assumes the server directory is accessible
  const serverPath = join(__dirname, '../../server/server.js');
  
  try {
    serverProcess = spawn('node', [serverPath], {
      stdio: 'inherit',
      cwd: join(__dirname, '../../server')
    });
    
    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
    });
    
    console.log('Server started with PID:', serverProcess.pid);
  } catch (error) {
    console.error('Error starting server:', error);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Allow loading from localhost
    },
    icon: process.platform === 'linux' ? join(__dirname, '../dist/vite.svg') : undefined
  });
  
  // Start the server first
  startServer();
  
  // Wait a bit for server to start, then load the app
  setTimeout(() => {
    if (process.env.VITE_DEV_SERVER_URL) {
      win.loadURL(process.env.VITE_DEV_SERVER_URL);
      // Open DevTools in development
      win.webContents.openDevTools();
    } else {
      win.loadFile(join(__dirname, '../dist/index.html'));
    }
  }, 2000);
  
  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Allow navigation within the app
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return { action: 'allow' };
    }
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  // Kill server process when app closes
  if (serverProcess) {
    serverProcess.kill();
  }
  
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  // Kill server process when app quits
  if (serverProcess) {
    serverProcess.kill();
  }
});

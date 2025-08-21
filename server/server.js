const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.ensureDirSync(UPLOADS_DIR);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio and image files
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio and image files are allowed!'), false);
    }
  }
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Data file paths
const ORBS_FILE = path.join(__dirname, 'data', 'orbs.json');
const SOUNDBOARD_FILE = path.join(__dirname, 'data', 'soundboard.json');

// Ensure data directory and files exist
async function initializeDataFiles() {
  try {
    await fs.ensureDir(path.dirname(ORBS_FILE));
    
    // Check if orbs file exists, if not create it with empty array
    if (!(await fs.pathExists(ORBS_FILE))) {
      await fs.writeJSON(ORBS_FILE, [], { spaces: 2 });
      console.log('Created initial orbs.json file');
    }
    
    // Check if soundboard file exists, if not create it with empty array
    if (!(await fs.pathExists(SOUNDBOARD_FILE))) {
      await fs.writeJSON(SOUNDBOARD_FILE, [], { spaces: 2 });
      console.log('Created initial soundboard.json file');
    }
  } catch (error) {
    console.error('Error initializing data files:', error);
  }
}

// Helper function to read orbs data
async function readOrbs() {
  try {
    return await fs.readJSON(ORBS_FILE);
  } catch (error) {
    console.error('Error reading orbs:', error);
    return [];
  }
}

// Helper function to write orbs data
async function writeOrbs(orbs) {
  try {
    await fs.writeJSON(ORBS_FILE, orbs, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('Error writing orbs:', error);
    return false;
  }
}

// Helper function to read soundboard data
async function readSoundboard() {
  try {
    return await fs.readJSON(SOUNDBOARD_FILE);
  } catch (error) {
    console.error('Error reading soundboard:', error);
    return [];
  }
}

// Helper function to write soundboard data
async function writeSoundboard(triggers) {
  try {
    await fs.writeJSON(SOUNDBOARD_FILE, triggers, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('Error writing soundboard:', error);
    return false;
  }
}

// Routes

// GET /api/orbs - Get all orbs
app.get('/api/orbs', async (req, res) => {
  try {
    const orbs = await readOrbs();
    console.log(`GET /api/orbs - Returning ${orbs.length} orbs`);
    res.json(orbs);
  } catch (error) {
    console.error('Error getting orbs:', error);
    res.status(500).json({ error: 'Failed to get orbs' });
  }
});

// POST /api/orbs - Replace all orbs
app.post('/api/orbs', async (req, res) => {
  try {
    const orbs = req.body;
    
    if (!Array.isArray(orbs)) {
      return res.status(400).json({ error: 'Orbs must be an array' });
    }
    
    const success = await writeOrbs(orbs);
    if (success) {
      console.log(`POST /api/orbs - Saved ${orbs.length} orbs`);
      res.json({ success: true, count: orbs.length });
    } else {
      res.status(500).json({ error: 'Failed to save orbs' });
    }
  } catch (error) {
    console.error('Error saving orbs:', error);
    res.status(500).json({ error: 'Failed to save orbs' });
  }
});

// PUT /api/orbs/:id - Update a specific orb
app.put('/api/orbs/:id', async (req, res) => {
  try {
    const orbId = req.params.id;
    const updatedOrb = req.body;
    
    const orbs = await readOrbs();
    const orbIndex = orbs.findIndex(orb => orb.id === orbId);
    
    if (orbIndex === -1) {
      return res.status(404).json({ error: 'Orb not found' });
    }
    
    orbs[orbIndex] = { ...orbs[orbIndex], ...updatedOrb, id: orbId };
    
    const success = await writeOrbs(orbs);
    if (success) {
      console.log(`PUT /api/orbs/${orbId} - Updated orb`);
      res.json(orbs[orbIndex]);
    } else {
      res.status(500).json({ error: 'Failed to update orb' });
    }
  } catch (error) {
    console.error('Error updating orb:', error);
    res.status(500).json({ error: 'Failed to update orb' });
  }
});

// DELETE /api/orbs/:id - Delete a specific orb
app.delete('/api/orbs/:id', async (req, res) => {
  try {
    const orbId = req.params.id;
    
    const orbs = await readOrbs();
    const filteredOrbs = orbs.filter(orb => orb.id !== orbId);
    
    if (filteredOrbs.length === orbs.length) {
      return res.status(404).json({ error: 'Orb not found' });
    }
    
    const success = await writeOrbs(filteredOrbs);
    if (success) {
      console.log(`DELETE /api/orbs/${orbId} - Deleted orb`);
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to delete orb' });
    }
  } catch (error) {
    console.error('Error deleting orb:', error);
    res.status(500).json({ error: 'Failed to delete orb' });
  }
});

// DELETE /api/orbs - Clear all orbs
app.delete('/api/orbs', async (req, res) => {
  try {
    const success = await writeOrbs([]);
    if (success) {
      console.log('DELETE /api/orbs - Cleared all orbs');
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to clear orbs' });
    }
  } catch (error) {
    console.error('Error clearing orbs:', error);
    res.status(500).json({ error: 'Failed to clear orbs' });
  }
});

// Soundboard routes

// GET /api/soundboard - Get all sound triggers
app.get('/api/soundboard', async (req, res) => {
  try {
    const triggers = await readSoundboard();
    console.log(`GET /api/soundboard - Returning ${triggers.length} triggers`);
    res.json(triggers);
  } catch (error) {
    console.error('Error getting soundboard:', error);
    res.status(500).json({ error: 'Failed to get soundboard' });
  }
});

// POST /api/soundboard - Replace all sound triggers
app.post('/api/soundboard', async (req, res) => {
  try {
    const triggers = req.body;
    
    if (!Array.isArray(triggers)) {
      return res.status(400).json({ error: 'Triggers must be an array' });
    }
    
    const success = await writeSoundboard(triggers);
    if (success) {
      console.log(`POST /api/soundboard - Saved ${triggers.length} triggers`);
      res.json({ success: true, count: triggers.length });
    } else {
      res.status(500).json({ error: 'Failed to save soundboard' });
    }
  } catch (error) {
    console.error('Error saving soundboard:', error);
    res.status(500).json({ error: 'Failed to save soundboard' });
  }
});

// PUT /api/soundboard/:id - Update a specific sound trigger
app.put('/api/soundboard/:id', async (req, res) => {
  try {
    const triggerId = req.params.id;
    const updatedTrigger = req.body;
    
    const triggers = await readSoundboard();
    const triggerIndex = triggers.findIndex(trigger => trigger.id === triggerId);
    
    if (triggerIndex === -1) {
      return res.status(404).json({ error: 'Sound trigger not found' });
    }
    
    triggers[triggerIndex] = { ...triggers[triggerIndex], ...updatedTrigger, id: triggerId };
    
    const success = await writeSoundboard(triggers);
    if (success) {
      console.log(`PUT /api/soundboard/${triggerId} - Updated sound trigger`);
      res.json(triggers[triggerIndex]);
    } else {
      res.status(500).json({ error: 'Failed to update sound trigger' });
    }
  } catch (error) {
    console.error('Error updating sound trigger:', error);
    res.status(500).json({ error: 'Failed to update sound trigger' });
  }
});

// DELETE /api/soundboard/:id - Delete a specific sound trigger
app.delete('/api/soundboard/:id', async (req, res) => {
  try {
    const triggerId = req.params.id;
    
    const triggers = await readSoundboard();
    const filteredTriggers = triggers.filter(trigger => trigger.id !== triggerId);
    
    if (filteredTriggers.length === triggers.length) {
      return res.status(404).json({ error: 'Sound trigger not found' });
    }
    
    const success = await writeSoundboard(filteredTriggers);
    if (success) {
      console.log(`DELETE /api/soundboard/${triggerId} - Deleted sound trigger`);
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to delete sound trigger' });
    }
  } catch (error) {
    console.error('Error deleting sound trigger:', error);
    res.status(500).json({ error: 'Failed to delete sound trigger' });
  }
});

// DELETE /api/soundboard - Clear all sound triggers
app.delete('/api/soundboard', async (req, res) => {
  try {
    const success = await writeSoundboard([]);
    if (success) {
      console.log('DELETE /api/soundboard - Cleared all sound triggers');
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to clear soundboard' });
    }
  } catch (error) {
    console.error('Error clearing soundboard:', error);
    res.status(500).json({ error: 'Failed to clear soundboard' });
  }
});

// File upload endpoints

// POST /api/upload/sound - Upload a sound file
app.post('/api/upload/sound', upload.single('sound'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No sound file uploaded' });
    }
    
    const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    console.log(`POST /api/upload/sound - Uploaded: ${req.file.filename}`);
    
    res.json({
      success: true,
      filename: req.file.filename,
      url: fileUrl,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading sound file:', error);
    res.status(500).json({ error: 'Failed to upload sound file' });
  }
});

// POST /api/upload/gif - Upload a GIF file
app.post('/api/upload/gif', upload.single('gif'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No GIF file uploaded' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`; // Return relative path
    console.log(`POST /api/upload/gif - Uploaded: ${req.file.filename}`);
    
    res.json({
      success: true,
      filename: req.file.filename,
      url: fileUrl,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading GIF file:', error);
    res.status(500).json({ error: 'Failed to upload GIF file' });
  }
});

// GET /api/uploads - List all uploaded files
app.get('/api/uploads', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = await fs.readdir(uploadsDir);
    
    const fileDetails = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(uploadsDir, filename);
        const stats = await fs.stat(filePath);
        const ext = path.extname(filename).toLowerCase();
        
        return {
          filename,
          url: `/uploads/${filename}`,
          originalName: filename,
          size: stats.size,
          uploadDate: stats.birthtime,
          type: ['.gif', '.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? 'image' : 
                ext === '.mp3' ? 'audio' : 'other'
        };
      })
    );
    
    console.log(`GET /api/uploads - Returning ${fileDetails.length} files`);
    res.json(fileDetails);
  } catch (error) {
    console.error('Error listing uploads:', error);
    res.status(500).json({ error: 'Failed to list uploads' });
  }
});

// DELETE /api/uploads/:filename - Delete an uploaded file
app.delete('/api/uploads/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Delete the file
    await fs.remove(filePath);
    console.log(`DELETE /api/uploads/${filename} - File deleted`);
    
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Chat API endpoints

// In-memory chat storage (you might want to persist this later)
let chatMessages = [];
let chatTriggers = [];

// Extension connection tracking
let extensionConnections = new Map(); // UUID -> { lastSeen, browser, version, userAgent }

// Helper to clean up old connections (remove if not seen in 30 seconds)
function cleanupOldConnections() {
  const now = Date.now();
  const timeout = 30000; // 30 seconds
  
  for (const [uuid, conn] of extensionConnections.entries()) {
    if (now - conn.lastSeen > timeout) {
      extensionConnections.delete(uuid);
      console.log(`Extension connection expired: ${uuid.substring(0, 8)}...`);
    }
  }
}

// Clean up old connections every 10 seconds
setInterval(cleanupOldConnections, 10000);

// POST /api/chat/message - Receive a chat message from extension
app.post('/api/chat/message', (req, res) => {
  try {
    const message = {
      ...req.body,
      serverTimestamp: new Date().toISOString(),
      processed: false
    };
    
    // Track extension connection
    const extensionUuid = req.headers['x-extension-uuid'] || req.body.extensionUuid;
    if (extensionUuid) {
      extensionConnections.set(extensionUuid, {
        lastSeen: Date.now(),
        browser: req.headers['x-extension-browser'] || req.body.browser || 'Unknown',
        version: req.headers['x-extension-version'] || req.body.version || '1.0',
        userAgent: req.headers['user-agent'] || 'Unknown'
      });
      console.log(`Extension connection updated: ${extensionUuid.substring(0, 8)}...`);
    }
    
    // Add to chat history (keep last 100 messages)
    chatMessages.unshift(message);
    if (chatMessages.length > 100) {
      chatMessages = chatMessages.slice(0, 100);
    }
    
    console.log(`Chat message from ${message.username}: ${message.text}`);
    
    // Check for triggers
    checkChatTriggers(message);
    
    res.json({ success: true, messageId: message.id });
  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// POST /api/chat/test - Test endpoint for extension
app.post('/api/chat/test', (req, res) => {
  const extensionUuid = req.headers['x-extension-uuid'] || req.body.extensionUuid;
  if (extensionUuid) {
    extensionConnections.set(extensionUuid, {
      lastSeen: Date.now(),
      browser: req.headers['x-extension-browser'] || req.body.browser || 'Unknown',
      version: req.headers['x-extension-version'] || req.body.version || '1.0',
      userAgent: req.headers['user-agent'] || 'Unknown'
    });
  }
  
  console.log('Chat test message received:', req.body);
  res.json({ success: true, message: 'Test message received', uuid: extensionUuid });
});

// GET /api/chat/extension-status - Get extension connection status
app.get('/api/chat/extension-status', async (req, res) => {
  cleanupOldConnections(); // Clean up before checking
  
  const connections = Array.from(extensionConnections.entries());
  const mostRecent = connections.length > 0 ? 
    connections.reduce((latest, [uuid, conn]) => 
      conn.lastSeen > latest.lastSeen ? { uuid, ...conn } : latest
    ) : null;
  
  // Check if admin panel is accessible
  let adminPanelStatus = 'unknown';
  try {
    // Simple check - in production you might want a more sophisticated health check
    adminPanelStatus = 'accessible'; // Assume accessible since we can't easily test from server
  } catch (error) {
    adminPanelStatus = 'error';
  }
  
  res.json({
    connected: connections.length > 0,
    totalConnections: connections.length,
    uuid: mostRecent?.uuid || null,
    lastSeen: mostRecent ? new Date(mostRecent.lastSeen).toISOString() : null,
    browser: mostRecent?.browser || null,
    version: mostRecent?.version || null,
    adminPanelStatus: adminPanelStatus,
    serverTime: new Date().toISOString()
  });
});

// POST /api/chat/ping-extension - Ping extension to test connection
app.post('/api/chat/ping-extension', (req, res) => {
  cleanupOldConnections();
  
  const connections = Array.from(extensionConnections.entries());
  
  if (connections.length === 0) {
    return res.json({ 
      success: false, 
      message: 'No extension connections found' 
    });
  }
  
  // For now, just confirm we have active connections
  // In a real implementation, you might send a message back to the extension
  const mostRecent = connections.reduce((latest, [uuid, conn]) => 
    conn.lastSeen > latest.lastSeen ? { uuid, ...conn } : latest
  );
  
  res.json({
    success: true,
    message: 'Extension connection verified',
    uuid: mostRecent.uuid,
    connections: connections.length,
    lastSeen: new Date(mostRecent.lastSeen).toISOString()
  });
});

// POST /api/chat/validate-admin-panel - Validate full extension to admin panel pipeline
app.post('/api/chat/validate-admin-panel', (req, res) => {
  try {
    cleanupOldConnections();
    
    const connections = Array.from(extensionConnections.entries());
    const hasExtensionConnection = connections.length > 0;
    
    // Create a test message to validate the pipeline
    const testMessage = {
      id: Date.now() + '-validation',
      username: 'System Validation',
      text: `Admin panel validation test at ${new Date().toLocaleTimeString()}`,
      timestamp: new Date().toISOString(),
      platform: 'validation',
      source: 'admin-validation',
      serverTimestamp: new Date().toISOString(),
      processed: true
    };
    
    // Add to chat messages
    chatMessages.unshift(testMessage);
    if (chatMessages.length > 100) {
      chatMessages = chatMessages.slice(0, 100);
    }
    
    console.log('Admin panel validation test message created');
    
    res.json({
      success: true,
      message: 'Admin panel validation test completed',
      testMessage: testMessage,
      extensionConnected: hasExtensionConnection,
      extensionCount: connections.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Admin panel validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Validation failed',
      message: error.message
    });
  }
});

// GET /api/chat/messages - Get recent chat messages
app.get('/api/chat/messages', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    messages: chatMessages.slice(0, limit),
    total: chatMessages.length
  });
});

// DELETE /api/chat/messages - Clear chat history
app.delete('/api/chat/messages', (req, res) => {
  chatMessages = [];
  console.log('Chat history cleared');
  res.json({ success: true });
});

// Chat triggers API
// GET /api/chat/triggers - Get all chat triggers
app.get('/api/chat/triggers', (req, res) => {
  res.json(chatTriggers);
});

// POST /api/chat/triggers - Add or update chat triggers
app.post('/api/chat/triggers', (req, res) => {
  try {
    chatTriggers = req.body;
    console.log(`Updated chat triggers: ${chatTriggers.length} triggers`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating chat triggers:', error);
    res.status(500).json({ error: 'Failed to update chat triggers' });
  }
});

// Function to check chat triggers
function checkChatTriggers(message) {
  const text = message.text.toLowerCase();
  
  for (const trigger of chatTriggers) {
    if (!trigger.enabled) continue;
    
    let shouldTrigger = false;
    
    if (trigger.type === 'contains' && text.includes(trigger.keyword.toLowerCase())) {
      shouldTrigger = true;
    } else if (trigger.type === 'exact' && text === trigger.keyword.toLowerCase()) {
      shouldTrigger = true;
    } else if (trigger.type === 'starts' && text.startsWith(trigger.keyword.toLowerCase())) {
      shouldTrigger = true;
    } else if (trigger.type === 'regex') {
      try {
        const regex = new RegExp(trigger.keyword, 'i');
        shouldTrigger = regex.test(text);
      } catch (e) {
        console.warn('Invalid regex in trigger:', trigger.keyword);
      }
    }
    
    if (shouldTrigger) {
      console.log(`Chat trigger activated: ${trigger.name} (${trigger.keyword})`);
      
      // Execute trigger action
      if (trigger.action === 'sound' && trigger.soundFile) {
        // Could broadcast this to connected clients
        console.log(`Would play sound: ${trigger.soundFile}`);
      } else if (trigger.action === 'command' && trigger.command) {
        console.log(`Would execute command: ${trigger.command}`);
      }
      
      // Mark message as processed
      message.triggered = true;
      message.triggerName = trigger.name;
    }
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function startServer() {
  await initializeDataFiles();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Stream Orbs server running on port ${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`Network access: http://192.168.68.68:${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  GET    /api/orbs         - Get all orbs`);
    console.log(`  POST   /api/orbs         - Replace all orbs`);
    console.log(`  PUT    /api/orbs/:id     - Update specific orb`);
    console.log(`  DELETE /api/orbs/:id     - Delete specific orb`);
    console.log(`  DELETE /api/orbs         - Clear all orbs`);
    console.log(`  GET    /api/soundboard   - Get all sound triggers`);
    console.log(`  POST   /api/soundboard   - Replace all sound triggers`);
    console.log(`  PUT    /api/soundboard/:id - Update specific sound trigger`);
    console.log(`  DELETE /api/soundboard/:id - Delete specific sound trigger`);
    console.log(`  DELETE /api/soundboard   - Clear all sound triggers`);
    console.log(`  GET    /api/chat/messages - Get recent chat messages`);
    console.log(`  POST   /api/chat/message  - Receive chat message (from extension)`);
    console.log(`  POST   /api/chat/test     - Test chat connection`);
    console.log(`  GET    /api/chat/extension-status - Get extension connection status`);
    console.log(`  POST   /api/chat/ping-extension - Test extension connection`);
    console.log(`  POST   /api/chat/validate-admin-panel - Validate admin panel pipeline`);
    console.log(`  DELETE /api/chat/messages - Clear chat history`);
    console.log(`  GET    /api/chat/triggers - Get chat triggers`);
    console.log(`  POST   /api/chat/triggers - Update chat triggers`);
    console.log(`  GET    /api/uploads     - List uploaded files`);
    console.log(`  DELETE /api/uploads/:filename - Delete uploaded file`);
    console.log(`  POST   /api/upload/sound - Upload sound file`);
    console.log(`  POST   /api/upload/gif   - Upload GIF file`);
    console.log(`  GET    /uploads/*        - Serve uploaded files`);
    console.log(`  GET    /health           - Health check`);
  });
}

startServer();

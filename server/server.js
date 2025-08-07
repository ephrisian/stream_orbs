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
    
    const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
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
    console.log(`  POST   /api/upload/sound - Upload sound file`);
    console.log(`  POST   /api/upload/gif   - Upload GIF file`);
    console.log(`  GET    /uploads/*        - Serve uploaded files`);
    console.log(`  GET    /health           - Health check`);
  });
}

startServer();

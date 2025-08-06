const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Data file path
const DATA_FILE = path.join(__dirname, 'data', 'orbs.json');

// Ensure data directory exists
async function initializeDataFile() {
  try {
    await fs.ensureDir(path.dirname(DATA_FILE));
    
    // Check if file exists, if not create it with empty array
    if (!(await fs.pathExists(DATA_FILE))) {
      await fs.writeJSON(DATA_FILE, [], { spaces: 2 });
      console.log('Created initial orbs.json file');
    }
  } catch (error) {
    console.error('Error initializing data file:', error);
  }
}

// Helper function to read orbs data
async function readOrbs() {
  try {
    return await fs.readJSON(DATA_FILE);
  } catch (error) {
    console.error('Error reading orbs:', error);
    return [];
  }
}

// Helper function to write orbs data
async function writeOrbs(orbs) {
  try {
    await fs.writeJSON(DATA_FILE, orbs, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('Error writing orbs:', error);
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function startServer() {
  await initializeDataFile();
  
  app.listen(PORT, () => {
    console.log(`Stream Orbs server running on port ${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  GET    /api/orbs     - Get all orbs`);
    console.log(`  POST   /api/orbs     - Replace all orbs`);
    console.log(`  PUT    /api/orbs/:id - Update specific orb`);
    console.log(`  DELETE /api/orbs/:id - Delete specific orb`);
    console.log(`  DELETE /api/orbs     - Clear all orbs`);
    console.log(`  GET    /health       - Health check`);
  });
}

startServer();

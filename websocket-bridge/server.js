const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Enable CORS for REST endpoints
app.use(cors());
app.use(express.json());

// Store connected clients
const clients = new Map();

// Client types
const CLIENT_TYPES = {
  EXTENSION: 'extension',
  ADMIN: 'admin'
};

console.log('🌉 WebSocket Bridge Server Starting...');

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const clientId = generateId();
  const clientInfo = {
    id: clientId,
    ws: ws,
    type: null,
    uuid: null,
    connectedAt: new Date(),
    lastSeen: new Date(),
    metadata: {}
  };
  
  clients.set(clientId, clientInfo);
  console.log(`🔗 New client connected: ${clientId} (Total: ${clients.size})`);
  
  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(clientId, message);
    } catch (error) {
      console.error(`❌ Error parsing message from ${clientId}:`, error);
      sendToClient(clientId, {
        type: 'error',
        message: 'Invalid JSON message'
      });
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    const client = clients.get(clientId);
    if (client) {
      console.log(`🔌 Client disconnected: ${clientId} (${client.type || 'unknown'}) - ${client.uuid || 'no-uuid'}`);
      clients.delete(clientId);
      
      // Notify other clients about disconnection
      broadcastToType(CLIENT_TYPES.ADMIN, {
        type: 'client_disconnected',
        clientType: client.type,
        uuid: client.uuid
      });
    }
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${clientId}:`, error);
  });
  
  // Send welcome message
  sendToClient(clientId, {
    type: 'welcome',
    clientId: clientId,
    timestamp: new Date().toISOString()
  });
});

function handleMessage(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;
  
  // Update last seen
  client.lastSeen = new Date();
  
  console.log(`📨 Message from ${clientId} (${client.type || 'unregistered'}):`, {
    type: message.type,
    target: message.target,
    hasData: !!message.data,
    hasMessage: !!message.message
  });
  
  switch (message.type) {
    case 'register':
      handleRegistration(clientId, message);
      break;
      
    case 'chat_message':
      handleChatMessage(clientId, message);
      break;
      
    case 'heartbeat':
      handleHeartbeat(clientId, message);
      break;
      
    case 'command':
      handleCommand(clientId, message);
      break;
      
    case 'response':
      handleResponse(clientId, message);
      break;
      
    case 'ping':
      sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
      break;
      
    default:
      console.log(`⚠️  Unknown message type from ${clientId}: ${message.type}`);
      sendToClient(clientId, {
        type: 'error',
        message: `Unknown message type: ${message.type}`
      });
  }
}

function handleRegistration(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;
  
  const { clientType, uuid, browser, version, url } = message;
  
  // Validate client type
  if (!Object.values(CLIENT_TYPES).includes(clientType)) {
    sendToClient(clientId, {
      type: 'error',
      message: `Invalid client type: ${clientType}`
    });
    return;
  }
  
  // Update client info
  client.type = clientType;
  client.uuid = uuid;
  client.metadata = {
    browser: browser,
    version: version,
    url: url,
    registeredAt: new Date()
  };
  
  console.log(`✅ Client registered: ${clientId} as ${clientType} (${uuid || 'no-uuid'})`);
  
  // Send registration confirmation
  sendToClient(clientId, {
    type: 'registered',
    clientType: clientType,
    clientId: clientId,
    timestamp: new Date().toISOString()
  });
  
  // Notify admin clients about new extension connection
  if (clientType === CLIENT_TYPES.EXTENSION) {
    broadcastToType(CLIENT_TYPES.ADMIN, {
      type: 'extension_connected',
      uuid: uuid,
      browser: browser,
      version: version,
      url: url,
      timestamp: new Date().toISOString()
    });
  }
  
  // Send current status to new admin clients
  if (clientType === CLIENT_TYPES.ADMIN) {
    const extensionClients = Array.from(clients.values())
      .filter(c => c.type === CLIENT_TYPES.EXTENSION);
    
    sendToClient(clientId, {
      type: 'status_update',
      extensions: extensionClients.map(c => ({
        uuid: c.uuid,
        browser: c.metadata.browser,
        version: c.metadata.version,
        url: c.metadata.url,
        connectedAt: c.connectedAt,
        lastSeen: c.lastSeen
      }))
    });
  }
}

function handleChatMessage(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;
  
  // Forward chat messages to admin panels
  if (message.target === 'admin' && message.message) {
    console.log(`💬 Chat message from ${client.type}: ${message.message.username}: ${message.message.text}`);
    
    broadcastToType(CLIENT_TYPES.ADMIN, {
      type: 'chat_message',
      message: message.message,
      source: {
        clientId: clientId,
        clientType: client.type,
        uuid: client.uuid
      },
      timestamp: new Date().toISOString()
    });
  }
}

function handleHeartbeat(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;
  
  // Forward heartbeat to admin panels with additional info
  if (message.target === 'admin' && message.data) {
    broadcastToType(CLIENT_TYPES.ADMIN, {
      type: 'heartbeat',
      data: {
        ...message.data,
        bridgeClientId: clientId,
        bridgeTimestamp: new Date().toISOString()
      }
    });
  }
  
  // Send heartbeat response
  sendToClient(clientId, {
    type: 'heartbeat_ack',
    timestamp: new Date().toISOString()
  });
}

function handleCommand(clientId, message) {
  const { target, command } = message;
  
  console.log(`🎯 Command from ${clientId}: ${command} -> ${target}`);
  
  // Forward command to target clients
  if (target === 'extension') {
    broadcastToType(CLIENT_TYPES.EXTENSION, {
      type: 'command',
      command: command,
      source: clientId,
      data: message.data,
      timestamp: new Date().toISOString()
    });
  } else if (target === 'admin') {
    broadcastToType(CLIENT_TYPES.ADMIN, {
      type: 'command',
      command: command,
      source: clientId,
      data: message.data,
      timestamp: new Date().toISOString()
    });
  }
}

function handleResponse(clientId, message) {
  const { target } = message;
  
  console.log(`📤 Response from ${clientId} -> ${target}`);
  
  // Forward response to target clients
  if (target === 'admin') {
    broadcastToType(CLIENT_TYPES.ADMIN, {
      type: 'response',
      command: message.command,
      result: message.result,
      source: clientId,
      timestamp: new Date().toISOString()
    });
  } else if (target === 'extension') {
    broadcastToType(CLIENT_TYPES.EXTENSION, {
      type: 'response',
      command: message.command,
      result: message.result,
      source: clientId,
      timestamp: new Date().toISOString()
    });
  }
}

function sendToClient(clientId, message) {
  const client = clients.get(clientId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`❌ Error sending to client ${clientId}:`, error);
      return false;
    }
  }
  return false;
}

function broadcastToType(clientType, message) {
  let sentCount = 0;
  
  clients.forEach((client, clientId) => {
    if (client.type === clientType && client.ws.readyState === WebSocket.OPEN) {
      if (sendToClient(clientId, message)) {
        sentCount++;
      }
    }
  });
  
  console.log(`📡 Broadcast to ${clientType} clients: ${sentCount} recipients`);
  return sentCount;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// REST API endpoints for monitoring
app.get('/status', (req, res) => {
  const clientStats = {
    total: clients.size,
    extensions: 0,
    admins: 0,
    unregistered: 0
  };
  
  const clientList = [];
  
  clients.forEach((client, clientId) => {
    if (client.type === CLIENT_TYPES.EXTENSION) {
      clientStats.extensions++;
    } else if (client.type === CLIENT_TYPES.ADMIN) {
      clientStats.admins++;
    } else {
      clientStats.unregistered++;
    }
    
    clientList.push({
      id: clientId,
      type: client.type,
      uuid: client.uuid,
      connectedAt: client.connectedAt,
      lastSeen: client.lastSeen,
      metadata: client.metadata
    });
  });
  
  res.json({
    status: 'running',
    uptime: process.uptime(),
    clients: clientStats,
    clientList: clientList,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    clients: clients.size
  });
});

// Broadcast test message (for debugging)
app.post('/test/broadcast', (req, res) => {
  const { type, message } = req.body;
  
  const testMessage = {
    type: 'test',
    message: message || 'Test broadcast from REST API',
    timestamp: new Date().toISOString()
  };
  
  let sent = 0;
  if (type === 'extension' || type === 'all') {
    sent += broadcastToType(CLIENT_TYPES.EXTENSION, testMessage);
  }
  if (type === 'admin' || type === 'all') {
    sent += broadcastToType(CLIENT_TYPES.ADMIN, testMessage);
  }
  
  res.json({
    success: true,
    messagesSent: sent,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🌉 WebSocket Bridge Server running on port ${PORT}`);
  console.log(`📊 Status endpoint: http://localhost:${PORT}/status`);
  console.log(`🏥 Health endpoint: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log('');
  console.log('Ready to bridge extension ↔ admin panel communication! 🚀');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebSocket Bridge Server...');
  
  // Close all client connections
  clients.forEach((client, clientId) => {
    client.ws.close();
  });
  
  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});

// Clean up dead connections every 30 seconds
setInterval(() => {
  const now = new Date();
  let cleaned = 0;
  
  clients.forEach((client, clientId) => {
    // Remove clients that haven't been seen in 5 minutes
    if (now - client.lastSeen > 5 * 60 * 1000) {
      console.log(`🧹 Cleaning up stale client: ${clientId}`);
      client.ws.close();
      clients.delete(clientId);
      cleaned++;
    }
  });
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} stale connections`);
  }
}, 30000);

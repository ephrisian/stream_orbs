// Injected script that runs in the page context (not the extension context)
// This gives us access to the page's actual WebSocket objects

console.log('Stream Orbs: Injected script loaded in page context');

// Store reference to original WebSocket
const OriginalWebSocket = window.WebSocket;
const OriginalEventSource = window.EventSource;

// Track all WebSocket connections
const activeSockets = new Set();

// Override WebSocket constructor
window.WebSocket = function(url, protocols) {
  console.log('Stream Orbs (Injected): WebSocket created:', url);
  
  const socket = new OriginalWebSocket(url, protocols);
  activeSockets.add(socket);
  
  // Hook into all message events
  const originalOnMessage = socket.onmessage;
  socket.onmessage = function(event) {
    console.log('Stream Orbs (Injected): WebSocket message:', url, event.data);
    
    // Try to parse and extract chat data
    try {
      const data = JSON.parse(event.data);
      checkForChatData(data, url, 'WebSocket');
    } catch (e) {
      // Not JSON, check if it looks like chat anyway
      if (typeof event.data === 'string' && event.data.length > 5 && event.data.length < 1000) {
        console.log('Stream Orbs (Injected): Non-JSON WebSocket data:', event.data);
        checkForChatData({ rawText: event.data }, url, 'WebSocket-Raw');
      }
    }
    
    // Call original handler
    if (originalOnMessage) {
      originalOnMessage.call(this, event);
    }
  };
  
  // Also hook addEventListener
  const originalAddEventListener = socket.addEventListener;
  socket.addEventListener = function(type, listener, options) {
    if (type === 'message') {
      const wrappedListener = function(event) {
        console.log('Stream Orbs (Injected): WebSocket addEventListener message:', url, event.data);
        
        try {
          const data = JSON.parse(event.data);
          checkForChatData(data, url, 'WebSocket-Listener');
        } catch (e) {
          if (typeof event.data === 'string' && event.data.length > 5) {
            checkForChatData({ rawText: event.data }, url, 'WebSocket-Listener-Raw');
          }
        }
        
        if (listener) {
          listener.call(this, event);
        }
      };
      originalAddEventListener.call(this, type, wrappedListener, options);
    } else {
      originalAddEventListener.call(this, type, listener, options);
    }
  };
  
  socket.addEventListener('close', () => {
    activeSockets.delete(socket);
    console.log('Stream Orbs (Injected): WebSocket closed:', url);
  });
  
  return socket;
};

// Copy static properties
Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);
Object.defineProperty(window.WebSocket, 'prototype', {
  value: OriginalWebSocket.prototype,
  writable: false
});

// Override EventSource (sometimes used for real-time updates)
window.EventSource = function(url, eventSourceInitDict) {
  console.log('Stream Orbs (Injected): EventSource created:', url);
  
  const source = new OriginalEventSource(url, eventSourceInitDict);
  
  const originalOnMessage = source.onmessage;
  source.onmessage = function(event) {
    console.log('Stream Orbs (Injected): EventSource message:', url, event.data);
    
    try {
      const data = JSON.parse(event.data);
      checkForChatData(data, url, 'EventSource');
    } catch (e) {
      if (typeof event.data === 'string' && event.data.length > 5) {
        checkForChatData({ rawText: event.data }, url, 'EventSource-Raw');
      }
    }
    
    if (originalOnMessage) {
      originalOnMessage.call(this, event);
    }
  };
  
  return source;
};

// Hook into fetch for API monitoring
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  const options = args[1] || {};
  
  if (typeof url === 'string') {
    // Log all requests for debugging
    console.log('Stream Orbs (Injected): Fetch request:', url, options.method || 'GET');
    
    // Monitor chat-related requests
    if (url.includes('chat') || url.includes('message') || url.includes('comment') || url.includes('live')) {
      console.log('Stream Orbs (Injected): Chat-related fetch:', url);
    }
  }
  
  return originalFetch.apply(this, args).then(response => {
    if (typeof url === 'string' && (url.includes('chat') || url.includes('message') || url.includes('live'))) {
      // Clone response to read it without consuming the original
      response.clone().text().then(text => {
        console.log('Stream Orbs (Injected): Chat API response:', url, text.substring(0, 500));
        
        try {
          const data = JSON.parse(text);
          checkForChatData(data, url, 'API');
        } catch (e) {
          // Not JSON
        }
      }).catch(() => {});
    }
    
    return response;
  });
};

// Function to check data for chat content
function checkForChatData(data, source, type) {
  if (!data || typeof data !== 'object') return;
  
  // Look for chat-like patterns
  const chatPatterns = [
    // Direct chat format
    (obj) => {
      if ((obj.type === 'chat' || obj.type === 'message' || obj.event === 'chat') && obj.data) {
        return extractChatMessage(obj.data, source, type);
      }
      return null;
    },
    
    // Message with user
    (obj) => {
      if ((obj.user || obj.username || obj.author) && (obj.message || obj.text || obj.content)) {
        return {
          username: obj.user || obj.username || obj.author,
          text: obj.message || obj.text || obj.content,
          timestamp: obj.timestamp || obj.time || new Date().toISOString(),
          source: source,
          type: type
        };
      }
      return null;
    },
    
    // Nested data
    (obj) => {
      if (obj.data && typeof obj.data === 'object') {
        return checkForChatData(obj.data, source, type + '-Nested');
      }
      return null;
    },
    
    // Array of messages
    (obj) => {
      if (Array.isArray(obj)) {
        const messages = [];
        obj.forEach(item => {
          const msg = checkForChatData(item, source, type + '-Array');
          if (msg) messages.push(msg);
        });
        return messages.length > 0 ? messages : null;
      }
      return null;
    },
    
    // Raw text
    (obj) => {
      if (obj.rawText && typeof obj.rawText === 'string') {
        // Try to extract username: message pattern
        const match = obj.rawText.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          return {
            username: match[1].trim(),
            text: match[2].trim(),
            timestamp: new Date().toISOString(),
            source: source,
            type: type
          };
        } else if (obj.rawText.length > 5 && obj.rawText.length < 500) {
          return {
            username: 'Unknown',
            text: obj.rawText,
            timestamp: new Date().toISOString(),
            source: source,
            type: type
          };
        }
      }
      return null;
    }
  ];
  
  for (const pattern of chatPatterns) {
    const result = pattern(data);
    if (result) {
      if (Array.isArray(result)) {
        result.forEach(msg => sendChatMessage(msg));
      } else {
        sendChatMessage(result);
      }
      return;
    }
  }
}

function extractChatMessage(data, source, type) {
  if (!data) return null;
  
  return {
    username: data.user || data.username || data.author || data.name || 'Unknown',
    text: data.message || data.text || data.content || data.body || '',
    timestamp: data.timestamp || data.time || data.created_at || new Date().toISOString(),
    source: source,
    type: type
  };
}

// Send chat message to content script via custom event
function sendChatMessage(message) {
  if (!message.text || message.text.length === 0) return;
  
  console.log('Stream Orbs (Injected): Found chat message:', message);
  
  // Dispatch custom event that content script can listen for
  const event = new CustomEvent('streamOrbsChatMessage', {
    detail: message
  });
  
  document.dispatchEvent(event);
}

// Also monitor DOM changes for dynamic content
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // Check if this looks like a chat message element
          const text = node.textContent?.trim();
          if (text && text.length > 5 && text.length < 500) {
            // Look for username: message pattern
            const match = text.match(/^([^:]+):\s*(.+)$/);
            if (match) {
              sendChatMessage({
                username: match[1].trim(),
                text: match[2].trim(),
                timestamp: new Date().toISOString(),
                source: 'DOM-Mutation',
                type: 'DOM-Pattern'
              });
            }
          }
        }
      });
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('Stream Orbs (Injected): WebSocket and API monitoring active');

// Log current WebSocket connections if any exist
setTimeout(() => {
  console.log('Stream Orbs (Injected): Active WebSocket connections:', activeSockets.size);
  activeSockets.forEach((socket, index) => {
    console.log(`  ${index + 1}. ${socket.url} - State: ${socket.readyState}`);
  });
}, 2000);

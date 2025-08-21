// Content script that runs on Whatnot pages
console.log('Stream Orbs: Whatnot chat monitor loaded');

class WhatnotChatMonitor {
  constructor() {
    this.isMonitoring = false;
    this.chatContainer = null;
    this.observer = null;
    this.lastMessageCount = 0;
    this.serverUrl = 'http://localhost:3001';
    this.extensionUuid = this.generateUUID();
    this.extensionVersion = '1.0.0';
    this.heartbeatInterval = null;
    this.websocketMonitor = null;
    
    console.log(`Stream Orbs: Extension initialized with UUID: ${this.extensionUuid}`);
    this.init();
  }
  
  async init() {
    // Start WebSocket monitoring first (more reliable)
    this.startWebSocketMonitoring();
    
    // Wait for the page to load and find chat elements as backup
    await this.waitForChatContainer();
    this.startMonitoring();
    this.startHeartbeat();
  }
  
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  startWebSocketMonitoring() {
    console.log('Stream Orbs: Starting WebSocket monitoring...');
    
    // Hook into WebSocket creation
    const originalWebSocket = window.WebSocket;
    const self = this;
    
    window.WebSocket = function(url, protocols) {
      console.log('Stream Orbs: WebSocket connection detected:', url);
      
      const ws = new originalWebSocket(url, protocols);
      
      // Monitor messages on this WebSocket
      const originalOnMessage = ws.onmessage;
      ws.onmessage = function(event) {
        self.handleWebSocketMessage(event, url);
        if (originalOnMessage) {
          originalOnMessage.call(this, event);
        }
      };
      
      // Also hook the addEventListener method
      const originalAddEventListener = ws.addEventListener;
      ws.addEventListener = function(type, listener, options) {
        if (type === 'message') {
          const wrappedListener = function(event) {
            self.handleWebSocketMessage(event, url);
            if (listener) {
              listener.call(this, event);
            }
          };
          originalAddEventListener.call(this, type, wrappedListener, options);
        } else {
          originalAddEventListener.call(this, type, listener, options);
        }
      };
      
      return ws;
    };
    
    // Also monitor fetch requests for chat APIs
    this.monitorFetchRequests();
  }
  
  monitorFetchRequests() {
    const originalFetch = window.fetch;
    const self = this;
    
    window.fetch = function(...args) {
      const url = args[0];
      const options = args[1] || {};
      
      // Log all fetch requests to help identify chat APIs
      if (typeof url === 'string' && (url.includes('chat') || url.includes('message') || url.includes('comment'))) {
        console.log('Stream Orbs: Chat-related fetch detected:', url, options);
      }
      
      // Call original fetch and monitor response
      return originalFetch.apply(this, args).then(response => {
        if (typeof url === 'string' && url.includes('chat')) {
          response.clone().text().then(text => {
            console.log('Stream Orbs: Chat API response:', url, text.substring(0, 500));
            self.tryParseApiResponse(text, url);
          }).catch(() => {});
        }
        return response;
      });
    };
  }
  
  handleWebSocketMessage(event, websocketUrl) {
    try {
      console.log('Stream Orbs: WebSocket message received:', websocketUrl, event.data);
      
      // Try to parse the message as JSON
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        // Not JSON, might be a different format
        console.log('Stream Orbs: Non-JSON WebSocket message:', event.data.substring(0, 200));
        return;
      }
      
      // Look for chat-like data in the WebSocket message
      this.extractChatFromWebSocketData(data, websocketUrl);
      
    } catch (error) {
      console.error('Stream Orbs: Error handling WebSocket message:', error);
    }
  }
  
  extractChatFromWebSocketData(data, url) {
    // Common patterns for chat data in WebSocket messages
    const patterns = [
      // Direct message format
      () => {
        if (data.type === 'chat' || data.type === 'message') {
          return {
            username: data.user || data.username || data.author || 'Unknown',
            text: data.message || data.text || data.content || '',
            timestamp: data.timestamp || new Date().toISOString()
          };
        }
        return null;
      },
      
      // Nested data format
      () => {
        if (data.data && (data.data.type === 'chat' || data.data.type === 'message')) {
          return {
            username: data.data.user || data.data.username || data.data.author || 'Unknown',
            text: data.data.message || data.data.text || data.data.content || '',
            timestamp: data.data.timestamp || new Date().toISOString()
          };
        }
        return null;
      },
      
      // Array of messages
      () => {
        if (Array.isArray(data) && data.length > 0) {
          const messages = [];
          for (const item of data) {
            if (item.text || item.message || item.content) {
              messages.push({
                username: item.user || item.username || item.author || 'Unknown',
                text: item.message || item.text || item.content || '',
                timestamp: item.timestamp || new Date().toISOString()
              });
            }
          }
          return messages.length > 0 ? messages : null;
        }
        return null;
      },
      
      // Generic object scanning
      () => {
        const result = this.scanObjectForChatData(data);
        return result.length > 0 ? result : null;
      }
    ];
    
    for (const pattern of patterns) {
      const result = pattern();
      if (result) {
        if (Array.isArray(result)) {
          result.forEach(msg => this.processChatMessage(msg, 'WebSocket'));
        } else {
          this.processChatMessage(result, 'WebSocket');
        }
        break;
      }
    }
  }
  
  scanObjectForChatData(obj, path = '') {
    const messages = [];
    
    if (!obj || typeof obj !== 'object') return messages;
    
    // Look for text-like properties that might contain chat messages
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string' && value.length > 5 && value.length < 500) {
        // Check if this looks like a chat message
        if (this.looksLikeChatMessage(value)) {
          messages.push({
            username: this.findUsernameNear(obj, key) || 'Unknown',
            text: value,
            timestamp: new Date().toISOString(),
            source: `WebSocket.${currentPath}`
          });
        }
      } else if (typeof value === 'object' && path.split('.').length < 5) {
        // Recursively scan nested objects (max 5 levels deep)
        messages.push(...this.scanObjectForChatData(value, currentPath));
      }
    }
    
    return messages;
  }
  
  looksLikeChatMessage(text) {
    // Heuristics to determine if text looks like a chat message
    const patterns = [
      /^[a-zA-Z0-9_]{2,20}\s*[:：]\s*.+/, // username: message
      /^.{5,200}$/, // reasonable length
      /[a-z][a-z]/, // contains lowercase letters (not just codes/IDs)
    ];
    
    return patterns.some(pattern => pattern.test(text)) && 
           !text.match(/^[A-Z0-9_-]{10,}$/) && // not just ID/code
           !text.includes('http') && // not URL
           !text.includes('{}') && // not JSON-like
           !text.includes('null');
  }
  
  findUsernameNear(obj, textKey) {
    // Look for username-like fields near the text field
    const usernameKeys = ['user', 'username', 'author', 'name', 'sender', 'from'];
    
    for (const key of usernameKeys) {
      if (obj[key] && typeof obj[key] === 'string' && obj[key].length > 0 && obj[key].length < 50) {
        return obj[key];
      }
    }
    
    return null;
  }
  
  tryParseApiResponse(responseText, url) {
    try {
      const data = JSON.parse(responseText);
      this.extractChatFromWebSocketData(data, url);
    } catch (e) {
      // Not JSON or parse error
    }
  }
  
  processChatMessage(message, source) {
    if (!message.text || message.text.length === 0) return;
    
    const processedMessage = {
      id: Date.now() + Math.random(),
      username: message.username || 'Unknown',
      text: message.text,
      timestamp: message.timestamp || new Date().toISOString(),
      source: source,
      platform: 'Whatnot'
    };
    
    console.log('Stream Orbs: Processed chat message from', source, ':', processedMessage);
    this.sendMessageToServer(processedMessage);
  }
  
  startHeartbeat() {
    // Send heartbeat every 15 seconds to maintain connection
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 15000);
    
    // Send initial heartbeat
    this.sendHeartbeat();
  }
  
  async sendHeartbeat() {
    try {
      await fetch(`${this.serverUrl}/api/chat/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-UUID': this.extensionUuid,
          'X-Extension-Browser': 'Firefox',
          'X-Extension-Version': this.extensionVersion
        },
        body: JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
          extensionUuid: this.extensionUuid,
          browser: 'Firefox',
          version: this.extensionVersion,
          url: window.location.href
        })
      });
    } catch (error) {
      console.warn('Stream Orbs: Heartbeat failed:', error.message);
    }
  }
  
  async waitForChatContainer() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 30; // Try for 30 seconds
      
      const checkForChat = () => {
        attempts++;
        console.log(`Stream Orbs: Attempt ${attempts}/${maxAttempts} - Looking for chat...`);
        
        // Whatnot-specific selectors based on user's sample
        const selectors = [
          // Whatnot-specific: inline divs with word-break (from user's sample HTML)
          'div[style*="display: inline"][style*="word-break: break-word"]',
          'div[style*="display:inline"][style*="word-break:break-word"]',
          'div[style*="word-break: break-word"]',
          'div[style*="word-break:break-word"]',
          
          // Common chat selectors
          '[data-testid="chat-messages"]',
          '[data-testid="chat-container"]',
          '[data-testid="message-list"]',
          '.chat-messages',
          '.message-list',
          '.messages-container',
          '[class*="chat"][class*="message"]',
          '[class*="message"][class*="container"]',
          '[class*="chat"][class*="container"]',
          '[class*="chat"]',
          '[class*="message"]',
          '[id*="chat"]',
          '[id*="message"]',
          '[data-cy*="chat"]',
          '[data-cy*="message"]',
          'div[role="log"]',
          'div[role="textbox"]',
          'ul[role="list"]'
        ];
        
        console.log('Stream Orbs: Checking selectors:', selectors);
        
        for (const selector of selectors) {
          const containers = document.querySelectorAll(selector);
          console.log(`Stream Orbs: Selector "${selector}" found ${containers.length} elements`);
          
          for (const container of containers) {
            // Check if this container has child elements that look like messages
            const possibleMessages = container.querySelectorAll('div, li, span, p');
            console.log(`Stream Orbs: Container has ${possibleMessages.length} child elements`);
            
            if (possibleMessages.length > 2) { // Likely a message container
              console.log('Stream Orbs: Found potential chat container:', selector);
              console.log('Stream Orbs: Container element:', container);
              console.log('Stream Orbs: Container HTML (first 500 chars):', container.outerHTML.substring(0, 500));
              
              this.chatContainer = container;
              resolve();
              return;
            }
          }
        }
        
        // Also scan for any elements containing text that looks like chat
        const allDivs = document.querySelectorAll('div');
        console.log(`Stream Orbs: Scanning ${allDivs.length} div elements for chat patterns...`);
        
        let foundChatLike = false;
        for (const div of allDivs) {
          const text = div.textContent?.trim();
          if (text && text.length > 10 && text.length < 200) {
            // Look for username: message pattern
            if (/^[a-zA-Z0-9_]{2,20}\s*[:：]\s*.+/.test(text)) {
              console.log('Stream Orbs: Found chat-like pattern:', text);
              console.log('Stream Orbs: Element:', div);
              
              // Use the parent as potential chat container
              if (div.parentElement && div.parentElement.children.length > 2) {
                this.chatContainer = div.parentElement;
                foundChatLike = true;
                break;
              }
            }
          }
        }
        
        if (foundChatLike) {
          console.log('Stream Orbs: Using chat-like pattern container');
          resolve();
          return;
        }
        
        if (attempts >= maxAttempts) {
          console.log('Stream Orbs: Could not find chat container after max attempts');
          
          // Fallback: scan for Whatnot inline divs even without container
          const chatElements = document.querySelectorAll('[class*="chat"], [id*="chat"]');
          if (chatElements.length > 0) {
            console.log('Stream Orbs: Using fallback chat detection');
            this.chatContainer = document.body; // Use body as container
          }
          
          resolve();
        } else {
          setTimeout(checkForChat, 1000);
        }
      };
      
      checkForChat();
    });
  }
  
  startMonitoring() {
    if (!this.chatContainer && !this.websocketMonitor) {
      console.log('Stream Orbs: No chat container found and no WebSocket monitoring active');
      return;
    }
    
    if (this.chatContainer) {
      console.log('Stream Orbs: Starting DOM mutation monitoring on:', this.chatContainer);
      
      // Create mutation observer for DOM changes
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                this.handleNewNode(node);
              }
            });
          }
        });
      });
      
      // Start observing
      this.observer.observe(this.chatContainer, {
        childList: true,
        subtree: true
      });
      
      // Also scan existing messages
      this.scanExistingMessages();
    }
    
    this.isMonitoring = true;
    console.log('Stream Orbs: Chat monitoring started');
  }
  
  handleNewNode(node) {
    // Look for message elements in the new node
    const messageElements = node.querySelectorAll('[class*="message"], [data-testid*="message"]');
    messageElements.forEach(el => this.extractMessageFromElement(el));
    
    // Check if the node itself is a message
    this.extractMessageFromElement(node);
  }
  
  scanExistingMessages() {
    if (!this.chatContainer) return;
    
    console.log('Stream Orbs: Scanning existing messages in container:', this.chatContainer);
    
    // Multiple selectors to find message elements
    const messageSelectors = [
      // Whatnot-specific inline div messages
      'div[style*="display: inline"][style*="word-break: break-word"]',
      'div[style*="display:inline"][style*="word-break:break-word"]',
      'div[style*="word-break: break-word"]',
      'div[style*="word-break:break-word"]',
      
      // Standard message selectors
      '[class*="message"]',
      '[data-testid*="message"]',
      'div[role="listitem"]',
      'li',
      'p',
      'div > div',
      'span'
    ];
    
    let foundElements = [];
    
    for (const selector of messageSelectors) {
      const elements = this.chatContainer.querySelectorAll(selector);
      console.log(`Stream Orbs: Selector "${selector}" found ${elements.length} elements`);
      
      for (const element of elements) {
        const text = element.textContent?.trim();
        if (text && text.length > 5 && text.length < 500) {
          foundElements.push({
            element: element,
            text: text,
            selector: selector
          });
        }
      }
    }
    
    console.log(`Stream Orbs: Found ${foundElements.length} potential message elements`);
    
    // Process the most promising elements (limit to avoid spam)
    foundElements.slice(0, 10).forEach(({ element, text, selector }) => {
      console.log(`Stream Orbs: Processing element from "${selector}": "${text.substring(0, 100)}"`);
      this.extractMessageFromElement(element);
    });
    
    // Also do a broad scan for inline divs
    this.scanWhatnotInlineDivs();
  }
  
  extractMessageFromElement(element) {
    try {
      console.log('Stream Orbs: Analyzing element for message data:', element.outerHTML.substring(0, 200));
      
      // Multiple strategies to extract message data
      const strategies = [
        // Strategy 1: Whatnot inline div format (user sample: <div style="display: inline; word-break: break-word;">test </div>)
        () => {
          const style = element.getAttribute('style') || '';
          if (style.includes('display') && style.includes('inline') && style.includes('word-break')) {
            const text = element.textContent?.trim();
            console.log('Stream Orbs: Found Whatnot inline div with text:', text);
            
            if (text && text.length > 0) {
              // For Whatnot, the username might be in a previous sibling or parent
              let username = 'Unknown';
              
              // Look for username in previous siblings
              let sibling = element.previousElementSibling;
              while (sibling && username === 'Unknown') {
                const siblingText = sibling.textContent?.trim();
                if (siblingText && siblingText.length > 0 && siblingText.length < 50) {
                  // Check if it looks like a username (no spaces, reasonable length)
                  if (!siblingText.includes(' ') && siblingText.length >= 2) {
                    username = siblingText;
                    break;
                  }
                }
                sibling = sibling.previousElementSibling;
              }
              
              // Look for username in parent's children
              if (username === 'Unknown' && element.parentElement) {
                const parentChildren = Array.from(element.parentElement.children);
                const elementIndex = parentChildren.indexOf(element);
                for (let i = elementIndex - 1; i >= 0; i--) {
                  const siblingText = parentChildren[i].textContent?.trim();
                  if (siblingText && !siblingText.includes(' ') && siblingText.length >= 2 && siblingText.length < 50) {
                    username = siblingText;
                    break;
                  }
                }
              }
              
              return {
                username: username,
                text: text,
                timestamp: new Date().toLocaleTimeString()
              };
            }
          }
          return { username: null, text: null, timestamp: null };
        },
        
        // Strategy 2: Parse text content directly for "username: message" pattern
        () => {
          const fullText = element.textContent?.trim() || '';
          console.log('Stream Orbs: Full element text:', fullText);
          
          // Try to parse "username: message" pattern
          const colonMatch = fullText.match(/^([^:]+):\s*(.+)$/);
          if (colonMatch) {
            return {
              username: colonMatch[1].trim(),
              text: colonMatch[2].trim(),
              timestamp: null
            };
          }
          
          // Fallback: treat as just text
          if (fullText.length > 5) {
            return {
              username: 'Unknown',
              text: fullText,
              timestamp: null
            };
          }
          
          return { username: null, text: null, timestamp: null };
        }
      ];
      
      let extractedData = null;
      
      // Try each strategy until we get usable data
      for (let i = 0; i < strategies.length; i++) {
        const result = strategies[i]();
        console.log(`Stream Orbs: Strategy ${i + 1} result:`, result);
        
        if (result.text && result.text.length > 0) {
          extractedData = result;
          console.log(`Stream Orbs: Using strategy ${i + 1} result`);
          break;
        }
      }
      
      if (!extractedData || !extractedData.text) {
        console.log('Stream Orbs: No usable message text found in element');
        return;
      }
      
      const message = {
        id: Date.now() + Math.random(),
        username: extractedData.username || 'Unknown',
        text: extractedData.text,
        timestamp: extractedData.timestamp || new Date().toISOString(),
        platform: 'Whatnot',
        source: 'DOM'
      };
      
      // Filter out messages that are likely UI elements
      const uiPatterns = /^(settings|menu|search|filter|sort|close|open|click|button|link)$/i;
      if (uiPatterns.test(message.text)) {
        console.log('Stream Orbs: Message filtered out as UI element:', message.text);
        return;
      }
      
      console.log('Stream Orbs: Extracted message:', message);
      this.sendMessageToServer(message);
    } catch (error) {
      console.error('Stream Orbs: Error extracting message:', error);
    }
  }
  
  async sendMessageToServer(message) {
    try {
      const response = await fetch(`${this.serverUrl}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-UUID': this.extensionUuid,
          'X-Extension-Browser': 'Firefox',
          'X-Extension-Version': this.extensionVersion
        },
        body: JSON.stringify({
          ...message,
          platform: 'Whatnot',
          extensionUuid: this.extensionUuid,
          browser: 'Firefox',
          version: this.extensionVersion,
          sourceUrl: window.location.href
        })
      });
      
      if (response.ok) {
        console.log('Stream Orbs: Message sent successfully');
      } else {
        console.warn('Stream Orbs: Failed to send message:', response.status);
      }
    } catch (error) {
      console.warn('Stream Orbs: Server not available:', error.message);
    }
  }
  
  // Specific function to scan the entire page for Whatnot inline div messages
  scanWhatnotInlineDivs() {
    console.log('Stream Orbs: Scanning entire page for Whatnot inline div messages...');
    
    const inlineDivs = document.querySelectorAll('div[style*="display: inline"][style*="word-break: break-word"], div[style*="display:inline"][style*="word-break:break-word"]');
    
    console.log(`Stream Orbs: Found ${inlineDivs.length} Whatnot inline divs`);
    
    inlineDivs.forEach((div, index) => {
      const text = div.textContent?.trim();
      console.log(`Stream Orbs: Inline div ${index + 1}: "${text}" - HTML: ${div.outerHTML}`);
      
      if (text && text.length > 0) {
        this.extractMessageFromElement(div);
      }
    });
    
    // Also look for any divs with word-break style (more permissive)
    const wordBreakDivs = document.querySelectorAll('div[style*="word-break"]');
    console.log(`Stream Orbs: Found ${wordBreakDivs.length} additional word-break divs`);
    
    wordBreakDivs.forEach((div, index) => {
      // Skip if already processed above
      if (!div.style.includes('display') || !div.style.includes('inline')) {
        const text = div.textContent?.trim();
        if (text && text.length > 0 && text.length < 200) {
          console.log(`Stream Orbs: Word-break div ${index + 1}: "${text}"`);
          this.extractMessageFromElement(div);
        }
      }
    });
  }
  
  stopMonitoring() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.isMonitoring = false;
    console.log('Stream Orbs: Chat monitoring stopped');
  }
}

// Initialize the monitor
let chatMonitor = null;

// Wait for page to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    chatMonitor = new WhatnotChatMonitor();
  });
} else {
  chatMonitor = new WhatnotChatMonitor();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({
      isMonitoring: chatMonitor ? chatMonitor.isMonitoring : false,
      chatContainer: chatMonitor ? !!chatMonitor.chatContainer : false,
      uuid: chatMonitor ? chatMonitor.extensionUuid : null
    });
  } else if (request.action === 'toggleMonitoring') {
    if (chatMonitor) {
      if (chatMonitor.isMonitoring) {
        chatMonitor.stopMonitoring();
      } else {
        chatMonitor.startMonitoring();
      }
      sendResponse({ isMonitoring: chatMonitor.isMonitoring });
    }
  } else if (request.action === 'forceDetect') {
    console.log('Stream Orbs: Force detection requested');
    if (chatMonitor) {
      // First scan for Whatnot inline divs specifically
      chatMonitor.scanWhatnotInlineDivs();
      
      // Then do the normal container detection
      chatMonitor.chatContainer = null; // Reset chat container
      chatMonitor.waitForChatContainer().then(() => {
        console.log('Stream Orbs: Force detection complete');
        sendResponse({ 
          success: true, 
          found: !!chatMonitor.chatContainer 
        });
      });
    }
    return true; // Keep message channel open for async response
  }
});

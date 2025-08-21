// Popup script for the extension
document.addEventListener('DOMContentLoaded', () => {
  const chatStatus = document.getElementById('chatStatus');
  const monitorStatus = document.getElementById('monitorStatus');
  const serverStatus = document.getElementById('serverStatus');
  const adminStatus = document.getElementById('adminStatus');
  const bridgeStatus = document.getElementById('bridgeStatus');
  const chatIndicator = document.getElementById('chatIndicator');
  const monitorIndicator = document.getElementById('monitorIndicator');
  const serverIndicator = document.getElementById('serverIndicator');
  const adminIndicator = document.getElementById('adminIndicator');
  const bridgeIndicator = document.getElementById('bridgeIndicator');
  const toggleBtn = document.getElementById('toggleBtn');
  const testBtn = document.getElementById('testBtn');
  const testAdminBtn = document.getElementById('testAdminBtn');
  const detectBtn = document.getElementById('detectBtn');
  const openStreamOrbs = document.getElementById('openStreamOrbs');
  
  let isMonitoring = false;
  
  // Check status on popup open
  checkStatus();
  
  // Event listeners
  toggleBtn.addEventListener('click', toggleMonitoring);
  testBtn.addEventListener('click', testConnection);
  testAdminBtn.addEventListener('click', testAdminPanel);
  detectBtn.addEventListener('click', forceDetectChat);
  openStreamOrbs.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173' });
  });
  
  async function checkStatus() {
    // Check if we're on a Whatnot page
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    
    const currentTab = tabs[0];
    const isWhatnotPage = currentTab && currentTab.url && currentTab.url.includes('whatnot.com');
    
    if (isWhatnotPage) {
      // Get status from content script
      chrome.tabs.sendMessage(currentTab.id, { action: 'getStatus' }, (response) => {
        if (response) {
          updateChatStatus(response.chatContainer);
          updateMonitoringStatus(response.isMonitoring);
          isMonitoring = response.isMonitoring;
        } else {
          updateChatStatus(false);
          updateMonitoringStatus(false);
        }
      });
    } else {
      chatStatus.textContent = 'Not on Whatnot';
      chatIndicator.className = 'status-indicator inactive';
      monitorStatus.textContent = 'Unavailable';
      monitorIndicator.className = 'status-indicator inactive';
      toggleBtn.disabled = true;
      toggleBtn.textContent = 'Go to Whatnot.com';
    }
    
    // Check server and admin panel status
    checkServerStatus();
    checkAdminPanelStatus();
    checkBridgeStatus();
  }
  
  function updateChatStatus(detected) {
    if (detected) {
      chatStatus.textContent = 'Detected';
      chatIndicator.className = 'status-indicator active';
    } else {
      chatStatus.textContent = 'Not Found';
      chatIndicator.className = 'status-indicator inactive';
    }
  }
  
  function updateMonitoringStatus(monitoring) {
    if (monitoring) {
      monitorStatus.textContent = 'Active';
      monitorIndicator.className = 'status-indicator active';
      toggleBtn.textContent = 'Stop Monitoring';
      toggleBtn.className = 'btn secondary';
    } else {
      monitorStatus.textContent = 'Stopped';
      monitorIndicator.className = 'status-indicator inactive';
      toggleBtn.textContent = 'Start Monitoring';
      toggleBtn.className = 'btn primary';
    }
    isMonitoring = monitoring;
  }
  
  async function checkServerStatus() {
    try {
      const response = await fetch('http://localhost:3001/health');
      if (response.ok) {
        serverStatus.textContent = 'Connected';
        serverIndicator.className = 'status-indicator active';
      } else {
        serverStatus.textContent = 'Error';
        serverIndicator.className = 'status-indicator inactive';
      }
    } catch (error) {
      serverStatus.textContent = 'Offline';
      serverIndicator.className = 'status-indicator inactive';
    }
  }
  
  async function checkAdminPanelStatus() {
    try {
      // Test admin panel availability
      const response = await fetch('http://localhost:5173/');
      if (response.ok) {
        // Also test if it can communicate with the server for chat data
        try {
          const chatResponse = await fetch('http://localhost:3001/api/chat/extension-status');
          if (chatResponse.ok) {
            const data = await chatResponse.json();
            if (data.connected) {
              adminStatus.textContent = 'Connected & Synced';
              adminIndicator.className = 'status-indicator active';
            } else {
              adminStatus.textContent = 'Available';
              adminIndicator.className = 'status-indicator inactive';
            }
          } else {
            adminStatus.textContent = 'Available';
            adminIndicator.className = 'status-indicator inactive';
          }
        } catch (e) {
          adminStatus.textContent = 'Available';
          adminIndicator.className = 'status-indicator inactive';
        }
      } else {
        adminStatus.textContent = 'Offline';
        adminIndicator.className = 'status-indicator inactive';
      }
    } catch (error) {
      adminStatus.textContent = 'Offline';
      adminIndicator.className = 'status-indicator inactive';
    }
  }
  
  async function checkBridgeStatus() {
    try {
      // Test WebSocket bridge availability
      const ws = new WebSocket('ws://localhost:8080/ws');
      
      ws.onopen = () => {
        bridgeStatus.textContent = 'Connected';
        bridgeIndicator.className = 'status-indicator active';
        ws.close();
      };
      
      ws.onerror = () => {
        bridgeStatus.textContent = 'Offline';
        bridgeIndicator.className = 'status-indicator inactive';
      };
      
      ws.onclose = (event) => {
        if (event.code !== 1000) { // Not a normal close
          bridgeStatus.textContent = 'Error';
          bridgeIndicator.className = 'status-indicator inactive';
        }
      };
      
      // Timeout after 3 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          bridgeStatus.textContent = 'Timeout';
          bridgeIndicator.className = 'status-indicator inactive';
        }
      }, 3000);
      
    } catch (error) {
      bridgeStatus.textContent = 'Error';
      bridgeIndicator.className = 'status-indicator inactive';
    }
  }
  
  async function toggleMonitoring() {
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    
    const currentTab = tabs[0];
    chrome.tabs.sendMessage(currentTab.id, { action: 'toggleMonitoring' }, (response) => {
      if (response) {
        updateMonitoringStatus(response.isMonitoring);
      }
    });
  }
  
  async function testConnection() {
    testBtn.textContent = 'Testing...';
    testBtn.disabled = true;
    
    try {
      // First, test server connection
      const serverResponse = await fetch('http://localhost:3001/api/chat/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Date.now(),
          username: 'Extension Test',
          text: 'Test message from Firefox extension',
          timestamp: new Date().toLocaleTimeString(),
          platform: 'test',
          source: 'popup-test'
        })
      });
      
      if (!serverResponse.ok) {
        throw new Error('Server connection failed');
      }
      
      // Then test admin panel connection by checking if it can fetch chat messages
      const adminTestResponse = await fetch('http://localhost:3001/api/chat/messages?limit=1');
      if (!adminTestResponse.ok) {
        throw new Error('Admin panel API not accessible');
      }
      
      // Test admin panel interface directly
      const adminPanelResponse = await fetch('http://localhost:5173/');
      if (!adminPanelResponse.ok) {
        throw new Error('Admin panel not accessible');
      }
      
      // If all tests pass, try to validate the extension connection status
      const extensionStatusResponse = await fetch('http://localhost:3001/api/chat/extension-status');
      if (extensionStatusResponse.ok) {
        const statusData = await extensionStatusResponse.json();
        
        if (statusData.connected) {
          testBtn.textContent = `✓ Connected (UUID: ${statusData.uuid?.substring(0, 8) || 'Unknown'})`;
        } else {
          testBtn.textContent = '⚠ Server OK, Extension Not Connected';
        }
      } else {
        testBtn.textContent = '✓ Server & Admin OK';
      }
      
      // Show success message longer
      setTimeout(() => {
        testBtn.textContent = 'Test Connection';
        testBtn.disabled = false;
      }, 4000);
      
    } catch (error) {
      console.error('Connection test failed:', error);
      
      if (error.message.includes('Admin panel')) {
        testBtn.textContent = '✗ Admin Panel Offline';
      } else if (error.message.includes('Server')) {
        testBtn.textContent = '✗ Server Offline';
      } else {
        testBtn.textContent = '✗ Connection Failed';
      }
      
      setTimeout(() => {
        testBtn.textContent = 'Test Connection';
        testBtn.disabled = false;
      }, 3000);
    }
  }
  
  async function testAdminPanel() {
    testAdminBtn.textContent = 'Testing Admin...';
    testAdminBtn.disabled = true;
    
    try {
      // Test admin panel accessibility
      const adminResponse = await fetch('http://localhost:5173/');
      if (!adminResponse.ok) {
        throw new Error('Admin panel not accessible');
      }
      
      // Send a test message to see if it appears in admin panel
      const testMessage = {
        id: Date.now(),
        username: 'Admin Test',
        text: `Admin panel test at ${new Date().toLocaleTimeString()}`,
        timestamp: new Date().toISOString(),
        platform: 'admin-test',
        source: 'popup-admin-test'
      };
      
      const messageResponse = await fetch('http://localhost:3001/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMessage)
      });
      
      if (!messageResponse.ok) {
        throw new Error('Failed to send test message');
      }
      
      // Verify the message can be retrieved
      const messagesResponse = await fetch('http://localhost:3001/api/chat/messages?limit=1');
      if (!messagesResponse.ok) {
        throw new Error('Failed to retrieve messages');
      }
      
      const messagesData = await messagesResponse.json();
      const latestMessage = messagesData.messages?.[0];
      
      if (latestMessage && latestMessage.text.includes('Admin panel test')) {
        testAdminBtn.textContent = '✓ Admin Panel Working!';
        
        // Suggest opening admin panel
        setTimeout(() => {
          if (confirm('Admin panel test successful! Open admin panel to see the test message?')) {
            chrome.tabs.create({ url: 'http://localhost:5173' });
          }
        }, 1000);
      } else {
        testAdminBtn.textContent = '⚠ Message Not Found';
      }
      
      setTimeout(() => {
        testAdminBtn.textContent = 'Test Admin Panel';
        testAdminBtn.disabled = false;
      }, 4000);
      
    } catch (error) {
      console.error('Admin panel test failed:', error);
      
      if (error.message.includes('Admin panel not accessible')) {
        testAdminBtn.textContent = '✗ Admin Panel Offline';
      } else if (error.message.includes('Failed to send')) {
        testAdminBtn.textContent = '✗ Server Not Responding';
      } else {
        testAdminBtn.textContent = '✗ Admin Test Failed';
      }
      
      setTimeout(() => {
        testAdminBtn.textContent = 'Test Admin Panel';
        testAdminBtn.disabled = false;
      }, 3000);
    }
  }
  
  async function forceDetectChat() {
    detectBtn.textContent = 'Detecting...';
    detectBtn.disabled = true;
    
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    
    const currentTab = tabs[0];
    chrome.tabs.sendMessage(currentTab.id, { action: 'forceDetect' }, (response) => {
      setTimeout(() => {
        detectBtn.textContent = 'Detect Chat';
        detectBtn.disabled = false;
        checkStatus(); // Refresh status
      }, 2000);
    });
  }
});

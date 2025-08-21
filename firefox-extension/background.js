// Background script for the extension
console.log('Stream Orbs: Background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Stream Orbs: Extension installed');
  
  // Set default settings
  chrome.storage.sync.set({
    monitoringEnabled: true,
    serverUrl: 'http://localhost:3001',
    chatDisplayEnabled: true
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'chatMessage') {
    // Forward chat message to all tabs (for internal communication)
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'newChatMessage',
          message: request.message
        });
      });
    });
  }
  
  return true; // Keep message channel open for async response
});

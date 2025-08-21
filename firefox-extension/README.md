# Firefox Extension Setup

## 🔧 **Enhanced - WebSocket & Connection Monitoring**

### 🚀 **New Features:**
- **WebSocket Monitoring**: Automatically detects and monitors WebSocket connections for real-time chat
- **UUID Connection Tracking**: Each extension instance has a unique UUID for connection verification
- **Admin Connection Status**: Real-time connection status in the admin panel
- **Heartbeat System**: Maintains connection with 15-second heartbeats
- **Multi-Source Detection**: Monitors WebSockets, API calls, and DOM changes

### 💬 **Chat Detection Methods:**
1. **WebSocket Monitoring** (Primary): Hooks into all WebSocket connections and monitors chat messages
2. **API Monitoring**: Monitors fetch requests for chat-related APIs  
3. **DOM Parsing** (Fallback): Specific support for Whatnot's inline div format
4. **Manual Detection**: Force scan with "Detect Chat" button

### 🔍 **WebSocket Detection:**
The extension now automatically detects and monitors:
- All WebSocket connections on the page
- JSON messages containing chat data
- Real-time message updates
- Various chat message formats

### 📋 **Testing Steps:**
1. **Start Server**: `cd server && npm start` (should show "Stream Orbs server running on port 3001")
2. **Start Admin Panel**: `cd react && npm run dev` (should show "Local: http://localhost:5173/")
3. **Install Extension**: Load as temporary add-on in `about:debugging`
4. **Open Whatnot**: Navigate to any Whatnot stream page (must be `*.whatnot.com`)
5. **Check Extension Popup**: Click extension icon in toolbar
6. **Verify Connections**: Look for:
   - Chat Detection: Should show "Detected" or "Not Found"
   - Server: Should show "Connected" 
   - Admin Panel: Should show "Connected & Synced" or "Available"
   - If not on Whatnot: Will show "Not on Whatnot"
7. **Test Admin Panel**: Click "Test Admin Panel" button in extension popup
8. **Validate Full Pipeline**: In admin panel, go to Chat tab → Click "Validate Admin Panel"
9. **Check Test Messages**: Should see test messages appear in chat history

### 🎯 **Admin Panel Validation:**

The extension now specifically validates its connection to the admin panel:

1. **Extension Popup**:
   - "Test Admin Panel" button sends a test message and verifies it appears
   - Separate status indicators for Server vs Admin Panel
   - "Test Full Connection" validates the complete pipeline

2. **Admin Panel**:
   - Real-time connection status with UUID tracking
   - "Validate Admin Panel" button creates test messages
   - Connection indicator shows if extension is synced with admin panel

3. **Validation Process**:
   - Extension → Server → Admin Panel message flow
   - Bidirectional communication testing
   - Pipeline integrity verification

### 🔍 **Troubleshooting:**

#### Extension Not Connecting to Site:
- **Check URL**: Extension only works on `*.whatnot.com` pages
- **Check Console**: Look for these messages:
  ```
  Stream Orbs: Whatnot chat monitor loaded
  Stream Orbs: Extension initialized with UUID: ...
  Stream Orbs: Injecting page context script...
  Stream Orbs: Injected script loaded successfully
  ```
- **Reload Extension**: If messages missing, reload in `about:debugging`
- **Reload Page**: After reloading extension, refresh the Whatnot page

#### Extension Connecting to Server But Not Finding Chat:
- **Check Injected Script**: Console should show:
  ```
  Stream Orbs (Injected): WebSocket and API monitoring active
  Stream Orbs (Injected): Active WebSocket connections: X
  ```
- **Check for WebSocket Activity**: Look for messages like:
  ```
  Stream Orbs (Injected): WebSocket created: wss://...
  Stream Orbs (Injected): WebSocket message: ...
  ```
- **Manual Detection**: Click "Detect Chat" button in extension popup
- **Check Chat Elements**: Use F12 Developer Tools to inspect chat messages

#### No WebSocket Messages:
- Some sites use polling instead of WebSockets
- Check Network tab (F12) for XHR/Fetch requests to chat APIs
- Look for messages like: `Stream Orbs (Injected): Chat-related fetch: ...`

## 🚀 **Installation & Setup**

1. **Open Firefox**
2. **Go to about:debugging**
3. **Click "This Firefox"**
4. **Click "Load Temporary Add-on"**
5. **Navigate to this folder and select `manifest.json`**

## Features

- **Chat Monitoring**: Automatically detects and monitors Whatnot chat messages
- **Real-time Sync**: Sends chat messages to your Stream Orbs server
- **Chat Overlay**: Displays chat in OBS with triggers highlighted
- **Chat Triggers**: Set up automated responses to specific keywords

## Usage

1. **Install the extension** using the instructions above
2. **Make sure your Stream Orbs server is running** on `http://localhost:3001`
3. **Navigate to any Whatnot stream page**
4. **Click the extension icon** to see status and controls
5. **Start monitoring** by clicking the toggle button

## Troubleshooting Chat Detection

### Step 1: Check Extension Status
- Click the extension icon in Firefox toolbar
- Look for these status indicators:
  - **Chat Detection**: Should show "Detected" when on a Whatnot page with chat
  - **Monitoring**: Should show "Active" when monitoring is enabled
  - **Server**: Should show "Connected" when Stream Orbs is running

### Step 2: Manual Detection
If chat detection shows "Not Found":
1. Click **"Detect Chat"** button to force re-scan
2. Check browser console for detailed logs:
   - Press F12 to open developer tools
   - Go to Console tab
   - Look for "Stream Orbs:" messages

### Step 3: Debug Chat Elements
The extension will log detailed information about:
- All selectors it's trying
- Elements found on the page
- Potential chat containers
- Message extraction attempts

Look for these console messages:
```
Stream Orbs: Attempt X/30 - Looking for chat...
Stream Orbs: Selector "..." found X elements
Stream Orbs: Found potential chat container: ...
Stream Orbs: Extracted message: {...}
```

### Step 4: Common Issues

**Chat Not Detected:**
- Whatnot may have updated their HTML structure
- Try refreshing the page and clicking "Detect Chat"
- Check if you're on an actual stream page (not homepage)

**Messages Not Appearing in Stream Orbs:**
- Click "Test Connection" to verify server connection
- Check Stream Orbs admin panel → Chat section for recent messages
- Verify the OBS page shows the chat overlay

**Extension Not Working:**
- Check that the extension is enabled in about:addons
- Reload the extension in about:debugging
- Make sure you're on a whatnot.com page

## Chat Detection Strategy

The extension uses multiple detection strategies:

1. **Data Attributes**: `[data-testid="chat-messages"]`, etc.
2. **CSS Classes**: `[class*="chat"]`, `[class*="message"]`, etc.
3. **Semantic Elements**: `div[role="log"]`, `ul[role="list"]`, etc.
4. **Text Pattern Analysis**: Looking for username:message patterns
5. **Broad Scanning**: Finding elements with chat-like characteristics

## Chat Message Extraction

The extension tries multiple strategies to extract messages:

1. **Structured Data**: Using data attributes and specific classes
2. **Common Patterns**: Looking for username/message/timestamp elements
3. **Text Parsing**: Parsing "username: message" patterns
4. **Fallback**: Treating any text as a potential message

## Development Notes

### Adding New Selectors
If Whatnot changes their chat structure, update the selectors in `waitForChatContainer()`:

```javascript
const selectors = [
  // Add new selectors here
  '[data-new-selector="chat"]',
  '.new-chat-class'
];
```

### Message Filtering
The extension filters out:
- Messages shorter than 1 character or longer than 500
- UI elements like "settings", "menu", etc.
- Duplicate messages (by content)

### Debugging Tips
1. Enable verbose logging by setting `console.log` level to "All"
2. Use "Detect Chat" button to trigger manual detection
3. Check the raw HTML structure using browser developer tools
4. Test with "Test Connection" to verify server communication

## Current Selectors Being Monitored

```javascript
// Primary selectors
'[data-testid="chat-messages"]'
'[data-testid="chat-container"]'
'[data-testid="message-list"]'
'.chat-messages'
'.message-list'
'.messages-container'

// Pattern-based selectors
'[class*="chat"][class*="message"]'
'[class*="message"][class*="container"]'
'[class*="chat"][class*="container"]'

// Generic selectors
'[class*="chat"]'
'[class*="message"]'
'[id*="chat"]'
'[id*="message"]'

// Accessibility selectors
'div[role="log"]'
'div[role="textbox"]'
'ul[role="list"]'
```

If none of these work, the extension will also scan page content for chat-like patterns.

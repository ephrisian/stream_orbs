import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  IconButton,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Settings as SettingsIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon
} from '@mui/icons-material';

interface ChatMessage {
  id: string | number;
  username: string;
  text: string;
  timestamp: string;
  platform: string;
  source?: string;
}

interface ExtensionStatus {
  connected: boolean;
  uuid?: string;
  browser?: string;
  version?: string;
  lastSeen?: string;
  url?: string;
}

interface BridgeMessage {
  type: string;
  target: string;
  clientType?: string;
  uuid?: string;
  message?: ChatMessage;
  data?: any;
  command?: string;
  result?: any;
}

export default function ChatControlWithBridge() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>({ connected: false });
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  const bridgeUrl = 'ws://localhost:8080/ws';

  // Connect to WebSocket bridge
  const connectToBridge = () => {
    try {
      console.log('ChatControl: Connecting to WebSocket bridge...');
      
      const ws = new WebSocket(bridgeUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('ChatControl: Connected to WebSocket bridge');
        setBridgeConnected(true);
        setReconnectAttempts(0);
        
        // Register as admin client
        ws.send(JSON.stringify({
          type: 'register',
          clientType: 'admin',
          uuid: 'admin-' + Date.now()
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data: BridgeMessage = JSON.parse(event.data);
          console.log('ChatControl: Message from bridge:', data);
          
          handleBridgeMessage(data);
        } catch (error) {
          console.error('ChatControl: Error parsing bridge message:', error);
        }
      };

      ws.onclose = () => {
        console.log('ChatControl: Disconnected from WebSocket bridge');
        setBridgeConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`ChatControl: Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectToBridge();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('ChatControl: WebSocket bridge error:', error);
        setBridgeConnected(false);
      };

    } catch (error) {
      console.error('ChatControl: Failed to connect to bridge:', error);
      setBridgeConnected(false);
    }
  };

  const handleBridgeMessage = (data: BridgeMessage) => {
    switch (data.type) {
      case 'chat_message':
        if (data.message && isMonitoring) {
          addMessage(data.message);
        }
        break;
        
      case 'heartbeat':
        // Update extension status from heartbeat
        if (data.data) {
          setExtensionStatus({
            connected: true,
            uuid: data.data.extensionUuid,
            browser: data.data.browser,
            version: data.data.version,
            lastSeen: new Date().toISOString(),
            url: data.data.url
          });
        }
        break;
        
      case 'register':
        // Another client registered
        if (data.clientType === 'extension') {
          setExtensionStatus({
            connected: true,
            uuid: data.uuid,
            lastSeen: new Date().toISOString()
          });
        }
        break;
        
      default:
        console.log('ChatControl: Unknown message type:', data.type);
    }
  };

  const sendToBridge = (message: BridgeMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => {
      const newMessages = [...prev, message];
      // Keep only last 100 messages
      return newMessages.slice(-100);
    });
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const exportMessages = () => {
    const dataStr = JSON.stringify(messages, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-messages-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const scanForChat = () => {
    sendToBridge({
      type: 'command',
      target: 'extension',
      command: 'scan_chat'
    });
  };

  const getExtensionStatus = () => {
    sendToBridge({
      type: 'command',
      target: 'extension',
      command: 'get_status'
    });
  };

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Initialize bridge connection
  useEffect(() => {
    connectToBridge();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  const getConnectionStatusIcon = () => {
    if (bridgeConnected && extensionStatus.connected) {
      return <WifiIcon color="success" />;
    } else if (bridgeConnected) {
      return <WifiIcon color="warning" />;
    } else {
      return <WifiOffIcon color="error" />;
    }
  };

  const getConnectionStatusText = () => {
    if (bridgeConnected && extensionStatus.connected) {
      return 'Connected (Bridge + Extension)';
    } else if (bridgeConnected) {
      return 'Bridge Connected (No Extension)';
    } else {
      return 'Disconnected';
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Chat Monitor (Bridge)
          {getConnectionStatusIcon()}
        </Typography>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={() => setSettingsOpen(true)} size="small">
            <SettingsIcon />
          </IconButton>
          <IconButton onClick={getExtensionStatus} size="small" title="Refresh Status">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Connection Status */}
      <Alert 
        severity={bridgeConnected && extensionStatus.connected ? 'success' : bridgeConnected ? 'warning' : 'error'}
        sx={{ mb: 2 }}
      >
        <Typography variant="body2">
          <strong>{getConnectionStatusText()}</strong>
          {extensionStatus.uuid && (
            <><br />UUID: {extensionStatus.uuid.substring(0, 8)}...</>
          )}
          {extensionStatus.url && (
            <><br />URL: {extensionStatus.url}</>
          )}
        </Typography>
      </Alert>

      {/* Controls */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant={isMonitoring ? "contained" : "outlined"}
          color={isMonitoring ? "success" : "primary"}
          startIcon={isMonitoring ? <PauseIcon /> : <PlayIcon />}
          onClick={() => setIsMonitoring(!isMonitoring)}
          size="small"
        >
          {isMonitoring ? 'Monitoring' : 'Paused'}
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={scanForChat}
          disabled={!bridgeConnected}
          size="small"
        >
          Scan Chat
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<ClearIcon />}
          onClick={clearMessages}
          size="small"
        >
          Clear
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportMessages}
          disabled={messages.length === 0}
          size="small"
        >
          Export
        </Button>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Message Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {messages.length} messages
        {!isMonitoring && ' (monitoring paused)'}
      </Typography>

      {/* Messages List */}
      <List
        ref={listRef}
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          maxHeight: 400,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1
        }}
      >
        {messages.length === 0 ? (
          <ListItem>
            <ListItemText
              primary="No messages yet"
              secondary={bridgeConnected ? "Waiting for chat messages from extension..." : "WebSocket bridge not connected"}
            />
          </ListItem>
        ) : (
          messages.map((message) => (
            <ListItem key={message.id} divider>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" component="span">
                      <strong>{message.username}:</strong> {message.text}
                    </Typography>
                    <Chip
                      label={message.platform}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                    {message.source && (
                      <Chip
                        label={message.source}
                        size="small"
                        variant="outlined"
                        color="secondary"
                      />
                    )}
                  </Box>
                }
                secondary={formatTimestamp(message.timestamp)}
              />
            </ListItem>
          ))
        )}
      </List>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chat Monitor Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
              }
              label="Auto-scroll to new messages"
            />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Bridge Connection
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status: {bridgeConnected ? 'Connected' : 'Disconnected'}
                <br />
                URL: {bridgeUrl}
                <br />
                Reconnect attempts: {reconnectAttempts}/{maxReconnectAttempts}
              </Typography>
            </Box>
            
            {extensionStatus.connected && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Extension Details
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  UUID: {extensionStatus.uuid}
                  <br />
                  Browser: {extensionStatus.browser}
                  <br />
                  Version: {extensionStatus.version}
                  <br />
                  Last Seen: {extensionStatus.lastSeen ? formatTimestamp(extensionStatus.lastSeen) : 'Never'}
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

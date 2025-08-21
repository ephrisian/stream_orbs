import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ChatIcon from '@mui/icons-material/Chat';
import BoltIcon from '@mui/icons-material/Bolt';
import ClearIcon from '@mui/icons-material/Clear';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface ChatMessage {
  id: string | number;
  username: string;
  text: string;
  timestamp: string;
  platform: string;
  triggered?: boolean;
  triggerName?: string;
}

interface ChatTrigger {
  id: string;
  name: string;
  keyword: string;
  type: 'contains' | 'exact' | 'starts' | 'regex';
  action: 'sound' | 'command' | 'notification';
  soundFile?: string;
  command?: string;
  enabled: boolean;
}

interface ChatSettings {
  overlayEnabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  maxMessages: number;
  showTimestamps: boolean;
  showPlatform: boolean;
  backgroundColor: string;
  textColor: string;
}

interface ExtensionConnectionStatus {
  connected: boolean;
  uuid: string | null;
  lastSeen: Date | null;
  browser?: string;
  version?: string;
}

export const ChatControl: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [triggers, setTriggers] = useState<ChatTrigger[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ExtensionConnectionStatus>({
    connected: false,
    uuid: null,
    lastSeen: null
  });
  const [settings, setSettings] = useState<ChatSettings>({
    overlayEnabled: true,
    position: 'bottom-left',
    maxMessages: 10,
    showTimestamps: false,
    showPlatform: true,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    textColor: '#ffffff'
  });
  
  const [newTrigger, setNewTrigger] = useState<Partial<ChatTrigger>>({
    name: '',
    keyword: '',
    type: 'contains',
    action: 'notification',
    enabled: true
  });

  // Fetch messages and triggers
  const fetchMessages = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/chat/messages?limit=20');
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.warn('Failed to fetch messages:', error);
    }
  };

  const fetchTriggers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/chat/triggers');
      if (response.ok) {
        const data = await response.json();
        setTriggers(data || []);
      }
    } catch (error) {
      console.warn('Failed to fetch triggers:', error);
    }
  };

  // Check extension connection status
  const checkExtensionConnection = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/chat/extension-status');
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus({
          connected: data.connected || false,
          uuid: data.uuid || null,
          lastSeen: data.lastSeen ? new Date(data.lastSeen) : null,
          browser: data.browser,
          version: data.version
        });
      } else {
        setConnectionStatus(prev => ({ ...prev, connected: false }));
      }
    } catch (error) {
      console.warn('Failed to check extension status:', error);
      setConnectionStatus(prev => ({ ...prev, connected: false }));
    }
  };

  // Test connection by sending a ping to extension
  const pingExtension = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/chat/ping-extension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Extension ping ${data.success ? 'successful' : 'failed'}${data.uuid ? ` (UUID: ${data.uuid.substring(0, 8)}...)` : ''}`);
        checkExtensionConnection(); // Refresh status
      }
    } catch (error) {
      console.error('Failed to ping extension:', error);
      alert('Failed to ping extension');
    }
  };

  // Validate full admin panel pipeline
  const validateAdminPanel = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/chat/validate-admin-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'admin-panel' })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Admin panel validation ${data.success ? 'successful' : 'failed'}!\n\nTest message created: "${data.testMessage?.text}"\nExtension connected: ${data.extensionConnected ? 'Yes' : 'No'}`);
        
        // Refresh messages and connection status
        fetchMessages();
        checkExtensionConnection();
      } else {
        const errorData = await response.json();
        alert(`Admin panel validation failed: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to validate admin panel:', error);
      alert('Failed to validate admin panel connection');
    }
  };

  // Save settings to localStorage and sync
  const saveSettings = (newSettings: ChatSettings) => {
    setSettings(newSettings);
    localStorage.setItem('chatSettings', JSON.stringify(newSettings));
    window.dispatchEvent(new CustomEvent('chatSettingsChanged'));
  };

  // Save triggers to server
  const saveTriggers = async (newTriggers: ChatTrigger[]) => {
    try {
      const response = await fetch('http://localhost:3001/api/chat/triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTriggers)
      });
      
      if (response.ok) {
        setTriggers(newTriggers);
      }
    } catch (error) {
      console.error('Failed to save triggers:', error);
    }
  };

  // Add new trigger
  const addTrigger = () => {
    if (!newTrigger.name || !newTrigger.keyword) return;
    
    const trigger: ChatTrigger = {
      id: Date.now().toString(),
      name: newTrigger.name!,
      keyword: newTrigger.keyword!,
      type: newTrigger.type || 'contains',
      action: newTrigger.action || 'notification',
      soundFile: newTrigger.soundFile,
      command: newTrigger.command,
      enabled: newTrigger.enabled ?? true
    };
    
    const newTriggers = [...triggers, trigger];
    saveTriggers(newTriggers);
    
    setNewTrigger({
      name: '',
      keyword: '',
      type: 'contains',
      action: 'notification',
      enabled: true
    });
  };

  // Remove trigger
  const removeTrigger = (id: string) => {
    const newTriggers = triggers.filter(t => t.id !== id);
    saveTriggers(newTriggers);
  };

  // Toggle trigger
  const toggleTrigger = (id: string) => {
    const newTriggers = triggers.map(t => 
      t.id === id ? { ...t, enabled: !t.enabled } : t
    );
    saveTriggers(newTriggers);
  };

  // Clear chat history
  const clearMessages = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/chat/messages', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  };

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.warn('Failed to parse saved chat settings');
      }
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchMessages();
    fetchTriggers();
    checkExtensionConnection();
    
    const messageInterval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
    const connectionInterval = setInterval(checkExtensionConnection, 10000); // Check connection every 10 seconds
    
    return () => {
      clearInterval(messageInterval);
      clearInterval(connectionInterval);
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ChatIcon /> Chat Monitor & Triggers
      </Typography>

      {/* Extension Connection Status */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          {connectionStatus.connected ? <WifiIcon color="success" /> : <WifiOffIcon color="error" />}
          Extension Connection Status
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Chip
            icon={connectionStatus.connected ? <CheckCircleIcon /> : <ErrorIcon />}
            label={connectionStatus.connected ? 'Connected' : 'Disconnected'}
            color={connectionStatus.connected ? 'success' : 'error'}
            variant="filled"
          />
          
          {connectionStatus.uuid && (
            <Chip
              label={`UUID: ${connectionStatus.uuid.substring(0, 8)}...`}
              variant="outlined"
              size="small"
            />
          )}
          
          {connectionStatus.lastSeen && (
            <Typography variant="caption" color="text.secondary">
              Last seen: {connectionStatus.lastSeen.toLocaleTimeString()}
            </Typography>
          )}
          
          {connectionStatus.browser && (
            <Chip
              label={connectionStatus.browser}
              variant="outlined"
              size="small"
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={checkExtensionConnection}
            size="small"
          >
            Refresh Status
          </Button>
          
          <Button
            variant="contained"
            onClick={pingExtension}
            disabled={!connectionStatus.connected}
            size="small"
          >
            Test Connection
          </Button>
          
          <Button
            variant="contained"
            onClick={validateAdminPanel}
            color="success"
            size="small"
          >
            Validate Admin Panel
          </Button>
        </Box>
        
        {!connectionStatus.connected && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="body2" color="warning.contrastText">
              Extension not connected. Make sure the Firefox extension is installed and active on a Whatnot page.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Chat Settings */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Chat Overlay Settings</Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.overlayEnabled}
                onChange={(e) => saveSettings({ ...settings, overlayEnabled: e.target.checked })}
              />
            }
            label="Show Chat Overlay in OBS"
          />
          
          <FormControl fullWidth>
            <InputLabel>Position</InputLabel>
            <Select
              value={settings.position}
              label="Position"
              onChange={(e) => saveSettings({ ...settings, position: e.target.value as any })}
            >
              <MenuItem value="top-left">Top Left</MenuItem>
              <MenuItem value="top-right">Top Right</MenuItem>
              <MenuItem value="bottom-left">Bottom Left</MenuItem>
              <MenuItem value="bottom-right">Bottom Right</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Max Messages"
            type="number"
            value={settings.maxMessages}
            onChange={(e) => saveSettings({ ...settings, maxMessages: parseInt(e.target.value) || 10 })}
            inputProps={{ min: 1, max: 50 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.showTimestamps}
                onChange={(e) => saveSettings({ ...settings, showTimestamps: e.target.checked })}
              />
            }
            label="Show Timestamps"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.showPlatform}
                onChange={(e) => saveSettings({ ...settings, showPlatform: e.target.checked })}
              />
            }
            label="Show Platform"
          />
        </Box>
      </Paper>

      {/* Recent Messages */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Recent Messages ({messages.length})</Typography>
          <Button 
            startIcon={<ClearIcon />} 
            onClick={clearMessages}
            color="warning"
          >
            Clear History
          </Button>
        </Box>
        
        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
          {messages.slice(0, 10).map((message) => (
            <ListItem key={message.id} divider>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" color="primary">
                      {message.username}
                    </Typography>
                    <Chip 
                      label={message.platform} 
                      size="small" 
                      variant="outlined" 
                    />
                    {message.triggered && (
                      <Chip 
                        label={`⚡ ${message.triggerName}`} 
                        size="small" 
                        color="success" 
                      />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {message.timestamp}
                    </Typography>
                  </Box>
                }
                secondary={message.text}
              />
            </ListItem>
          ))}
          {messages.length === 0 && (
            <ListItem>
              <ListItemText 
                primary="No messages yet" 
                secondary="Install the Firefox extension on Whatnot to start monitoring chat"
              />
            </ListItem>
          )}
        </List>
      </Paper>

      {/* Chat Triggers */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BoltIcon /> Chat Triggers
        </Typography>
        
        {/* Add New Trigger */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Add New Trigger</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <TextField
              label="Trigger Name"
              value={newTrigger.name || ''}
              onChange={(e) => setNewTrigger({ ...newTrigger, name: e.target.value })}
              placeholder="e.g., Welcome Message"
            />
            
            <TextField
              label="Keyword/Pattern"
              value={newTrigger.keyword || ''}
              onChange={(e) => setNewTrigger({ ...newTrigger, keyword: e.target.value })}
              placeholder="e.g., hello"
            />
            
            <FormControl>
              <InputLabel>Match Type</InputLabel>
              <Select
                value={newTrigger.type || 'contains'}
                label="Match Type"
                onChange={(e) => setNewTrigger({ ...newTrigger, type: e.target.value as any })}
              >
                <MenuItem value="contains">Contains</MenuItem>
                <MenuItem value="exact">Exact Match</MenuItem>
                <MenuItem value="starts">Starts With</MenuItem>
                <MenuItem value="regex">Regex</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl>
              <InputLabel>Action</InputLabel>
              <Select
                value={newTrigger.action || 'notification'}
                label="Action"
                onChange={(e) => setNewTrigger({ ...newTrigger, action: e.target.value as any })}
              >
                <MenuItem value="notification">Notification</MenuItem>
                <MenuItem value="sound">Play Sound</MenuItem>
                <MenuItem value="command">Run Command</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={addTrigger}
              disabled={!newTrigger.name || !newTrigger.keyword}
            >
              Add Trigger
            </Button>
          </Box>
        </Box>
        
        {/* Existing Triggers */}
        <List>
          {triggers.map((trigger) => (
            <ListItem key={trigger.id} divider>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1">{trigger.name}</Typography>
                    <Chip 
                      label={trigger.type} 
                      size="small" 
                      variant="outlined" 
                    />
                    <Chip 
                      label={trigger.action} 
                      size="small" 
                      color="primary" 
                    />
                    {!trigger.enabled && (
                      <Chip 
                        label="Disabled" 
                        size="small" 
                        color="default" 
                      />
                    )}
                  </Box>
                }
                secondary={`Keyword: "${trigger.keyword}"`}
              />
              <ListItemSecondaryAction>
                <FormControlLabel
                  control={
                    <Switch
                      checked={trigger.enabled}
                      onChange={() => toggleTrigger(trigger.id)}
                    />
                  }
                  label=""
                />
                <IconButton onClick={() => removeTrigger(trigger.id)} color="error">
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
          {triggers.length === 0 && (
            <ListItem>
              <ListItemText 
                primary="No triggers configured" 
                secondary="Add triggers to automatically respond to chat messages"
              />
            </ListItem>
          )}
        </List>
      </Paper>
    </Box>
  );
};

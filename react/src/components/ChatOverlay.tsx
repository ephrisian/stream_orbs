import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/system';

// Animation for new messages
const slideIn = keyframes`
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

interface ChatMessage {
  id: string | number;
  username: string;
  text: string;
  timestamp: string;
  platform: string;
  triggered?: boolean;
  triggerName?: string;
}

interface ChatOverlayProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  maxMessages?: number;
  width?: number;
  height?: number;
  showTimestamps?: boolean;
  showPlatform?: boolean;
  backgroundColor?: string;
  textColor?: string;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  position = 'bottom-left',
  maxMessages = 10,
  width = 400,
  height = 300,
  showTimestamps = false,
  showPlatform = true,
  backgroundColor = 'rgba(0, 0, 0, 0.8)',
  textColor = '#ffffff'
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Position styles
  const getPositionStyles = () => {
    const base = { position: 'fixed' as const, zIndex: 1000 };
    switch (position) {
      case 'top-left':
        return { ...base, top: 20, left: 20 };
      case 'top-right':
        return { ...base, top: 20, right: 20 };
      case 'bottom-left':
        return { ...base, bottom: 20, left: 20 };
      case 'bottom-right':
        return { ...base, bottom: 20, right: 20 };
      default:
        return { ...base, bottom: 20, left: 20 };
    }
  };

  // Fetch messages from server
  const fetchMessages = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/chat/messages?limit=20');
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.warn('ChatOverlay: Failed to fetch messages:', error);
    }
  };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Polling for new messages
  useEffect(() => {
    fetchMessages(); // Initial fetch
    
    pollIntervalRef.current = setInterval(fetchMessages, 2000); // Poll every 2 seconds
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Listen for chat settings changes
  useEffect(() => {
    const handleChatSettingsChange = () => {
      const chatSettings = localStorage.getItem('chatSettings');
      if (chatSettings) {
        try {
          const settings = JSON.parse(chatSettings);
          setIsVisible(settings.overlayEnabled ?? true);
        } catch (error) {
          console.warn('ChatOverlay: Failed to parse chat settings');
        }
      }
    };

    handleChatSettingsChange(); // Initial check
    window.addEventListener('storage', handleChatSettingsChange);
    window.addEventListener('chatSettingsChanged', handleChatSettingsChange);

    return () => {
      window.removeEventListener('storage', handleChatSettingsChange);
      window.removeEventListener('chatSettingsChanged', handleChatSettingsChange);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  // Limit messages and reverse for display (newest at bottom)
  const displayMessages = messages.slice(0, maxMessages).reverse();

  return (
    <Box
      sx={{
        ...getPositionStyles(),
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor: backgroundColor,
          color: textColor,
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 1,
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            💬 Live Chat
          </Typography>
        </Box>

        {/* Messages */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          {displayMessages.map((message) => (
            <Box
              key={message.id}
              sx={{
                animation: `${slideIn} 0.3s ease-out`,
                p: 1,
                borderRadius: 1,
                backgroundColor: message.triggered 
                  ? 'rgba(34, 197, 94, 0.2)' 
                  : 'rgba(255, 255, 255, 0.05)',
                border: message.triggered 
                  ? '1px solid rgba(34, 197, 94, 0.5)' 
                  : 'none',
              }}
            >
              {/* Username and platform */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: 600, 
                    color: message.triggered ? '#4ade80' : '#a78bfa'
                  }}
                >
                  {message.username}
                </Typography>
                
                {showPlatform && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '0.7rem'
                    }}
                  >
                    [{message.platform}]
                  </Typography>
                )}
                
                {showTimestamps && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '0.7rem',
                      ml: 'auto'
                    }}
                  >
                    {message.timestamp}
                  </Typography>
                )}
                
                {message.triggered && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#4ade80',
                      fontSize: '0.7rem',
                      ml: 'auto'
                    }}
                  >
                    ⚡ {message.triggerName}
                  </Typography>
                )}
              </Box>

              {/* Message text */}
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.85rem',
                  lineHeight: 1.4,
                  wordBreak: 'break-word'
                }}
              >
                {message.text}
              </Typography>
            </Box>
          ))}
          
          {/* Placeholder when no messages */}
          {displayMessages.length === 0 && (
            <Box
              sx={{
                p: 2,
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              <Typography variant="body2" sx={{ fontSize: '0.85rem', mb: 1 }}>
                💬 Chat Ready
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                Install Firefox extension on Whatnot to see chat messages
              </Typography>
            </Box>
          )}
          
          <div ref={messagesEndRef} />
        </Box>
      </Paper>
    </Box>
  );
};

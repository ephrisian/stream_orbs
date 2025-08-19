import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Timer as TimerIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

interface BannerImage {
  id: string;
  url: string;
  name: string;
  duration?: number; // Optional override duration per image
}

interface BannerSettings {
  enabled: boolean;
  defaultDuration: number; // seconds
  position: 'top' | 'bottom';
  height: number; // pixels
  autoStart: boolean;
  loop: boolean;
}

interface BannerControlProps {
  // These props will be used to communicate with OBS page
  onBannerUpdate?: (settings: BannerSettings, images: BannerImage[], currentIndex?: number) => void;
}

const BannerControl: React.FC<BannerControlProps> = ({ onBannerUpdate }) => {
  const [images, setImages] = useState<BannerImage[]>([]);
  const [settings, setSettings] = useState<BannerSettings>({
    enabled: false,
    defaultDuration: 30,
    position: 'top',
    height: 120,
    autoStart: false,
    loop: true
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(true);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with OBS page via localStorage
  const syncWithObs = useCallback((
    newSettings: BannerSettings, 
    newImages: BannerImage[], 
    currentIndex?: number
  ) => {
    const bannerData = {
      settings: newSettings,
      images: newImages,
      currentIndex: currentIndex ?? currentImageIndex,
      isPlaying,
      timeRemaining,
      timestamp: Date.now()
    };
    
    localStorage.setItem('bannerData', JSON.stringify(bannerData));
    
    // Notify OBS page of changes
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'bannerData',
      newValue: JSON.stringify(bannerData),
      storageArea: localStorage
    }));
    
    if (onBannerUpdate) {
      onBannerUpdate(newSettings, newImages, currentIndex);
    }
  }, [currentImageIndex, isPlaying, timeRemaining, onBannerUpdate]);

  // Add images
  const handleAddImages = useCallback(async (files: FileList) => {
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('gif', file); // Using 'gif' endpoint since it handles images
      
      try {
        const response = await fetch('http://localhost:3001/api/upload/gif', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          return {
            id: Math.random().toString(36).substr(2, 9),
            url: result.url, // Server URL path
            name: file.name
          };
        } else {
          console.error('Failed to upload image:', file.name);
          return null;
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        return null;
      }
    });
    
    const uploadedImages = await Promise.all(uploadPromises);
    const validImages = uploadedImages.filter(img => img !== null) as BannerImage[];
    
    if (validImages.length > 0) {
      const updatedImages = [...images, ...validImages];
      setImages(updatedImages);
      syncWithObs(settings, updatedImages);
    }
  }, [images, settings, syncWithObs]);

  // Remove image
  const handleRemoveImage = useCallback((imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    setImages(updatedImages);
    
    // Adjust current index if needed
    if (currentImageIndex >= updatedImages.length && updatedImages.length > 0) {
      setCurrentImageIndex(updatedImages.length - 1);
    }
    
    syncWithObs(settings, updatedImages);
  }, [images, currentImageIndex, settings, syncWithObs]);

  // Clear all images
  const handleClearImages = useCallback(() => {
    setImages([]);
    setCurrentImageIndex(0);
    setIsPlaying(false);
    setTimeRemaining(0);
    
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    syncWithObs(settings, []);
  }, [settings, syncWithObs]);

  // Start/stop slideshow
  const handleTogglePlayback = useCallback(() => {
    if (images.length === 0) return;
    
    if (isPlaying) {
      // Stop
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setTimeRemaining(0);
    } else {
      // Start
      setIsPlaying(true);
      const duration = images[currentImageIndex]?.duration || settings.defaultDuration;
      setTimeRemaining(duration);
      
      // Start countdown
      countdownRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Start image rotation timer
      timerRef.current = setInterval(() => {
        setCurrentImageIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % images.length;
          const nextDuration = images[nextIndex]?.duration || settings.defaultDuration;
          setTimeRemaining(nextDuration);
          return nextIndex;
        });
      }, duration * 1000);
    }
    
    syncWithObs(settings, images, currentImageIndex);
  }, [isPlaying, images, currentImageIndex, settings, syncWithObs]);

  // Update settings
  const handleSettingsChange = useCallback((newSettings: Partial<BannerSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    syncWithObs(updatedSettings, images);
  }, [settings, images, syncWithObs]);

  // Manual image navigation
  const handleImageSelect = useCallback((index: number) => {
    setCurrentImageIndex(index);
    if (isPlaying) {
      const duration = images[index]?.duration || settings.defaultDuration;
      setTimeRemaining(duration);
    }
    syncWithObs(settings, images, index);
  }, [isPlaying, images, settings, syncWithObs]);

  // Update timers when duration changes
  useEffect(() => {
    if (isPlaying && images.length > 0) {
      // Restart timers with new duration
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      
      const duration = images[currentImageIndex]?.duration || settings.defaultDuration;
      setTimeRemaining(duration);
      
      countdownRef.current = setInterval(() => {
        setTimeRemaining(prev => prev <= 1 ? 0 : prev - 1);
      }, 1000);
      
      timerRef.current = setInterval(() => {
        setCurrentImageIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % images.length;
          const nextDuration = images[nextIndex]?.duration || settings.defaultDuration;
          setTimeRemaining(nextDuration);
          return nextIndex;
        });
      }, duration * 1000);
    }
  }, [settings.defaultDuration, currentImageIndex, images, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      images.forEach(img => URL.revokeObjectURL(img.url));
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#212121' }}>
        🖼️ Banner Control
      </Typography>
      
      {/* Settings Panel */}
      <Card sx={{ mb: 2, backgroundColor: '#ffffff' }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enabled}
                  onChange={(e) => handleSettingsChange({ enabled: e.target.checked })}
                />
              }
              label="Enable Banner"
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Position</InputLabel>
              <Select
                value={settings.position}
                onChange={(e) => handleSettingsChange({ position: e.target.value as 'top' | 'bottom' })}
              >
                <MenuItem value="top">Top</MenuItem>
                <MenuItem value="bottom">Bottom</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Height (px)"
              type="number"
              value={settings.height}
              onChange={(e) => handleSettingsChange({ height: parseInt(e.target.value) || 120 })}
              size="small"
              sx={{ width: 120 }}
            />
            
            <TextField
              label="Duration (sec)"
              type="number"
              value={settings.defaultDuration}
              onChange={(e) => handleSettingsChange({ defaultDuration: parseInt(e.target.value) || 30 })}
              size="small"
              sx={{ width: 120 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.loop}
                  onChange={(e) => handleSettingsChange({ loop: e.target.checked })}
                />
              }
              label="Loop"
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Control Panel */}
      <Card sx={{ mb: 2, backgroundColor: '#ffffff' }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Button
              variant="outlined"
              component="label"
              startIcon={<AddIcon />}
              size="small"
            >
              Add Images
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files) {
                    handleAddImages(e.target.files);
                    e.target.value = ''; // Reset for re-upload
                  }
                }}
              />
            </Button>

            <Button
              variant={isPlaying ? "contained" : "outlined"}
              startIcon={isPlaying ? <StopIcon /> : <PlayIcon />}
              onClick={handleTogglePlayback}
              disabled={images.length === 0}
              color={isPlaying ? "error" : "success"}
              size="small"
            >
              {isPlaying ? 'Stop' : 'Start'} Slideshow
            </Button>

            <Button
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={handleClearImages}
              color="error"
              size="small"
              disabled={images.length === 0}
            >
              Clear All
            </Button>

            <IconButton
              onClick={() => setPreviewVisible(!previewVisible)}
              color="primary"
              size="small"
            >
              {previewVisible ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </IconButton>

            {isPlaying && (
              <Chip
                icon={<TimerIcon />}
                label={formatTime(timeRemaining)}
                color="primary"
                variant="outlined"
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Preview */}
      {previewVisible && images.length > 0 && (
        <Card sx={{ mb: 2, backgroundColor: '#ffffff' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Preview (Image {currentImageIndex + 1} of {images.length})
            </Typography>
            <Box sx={{ 
              height: settings.height,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              padding: 2,
              gap: 2,
              boxShadow: 2
            }}>
              <Box
                component="img"
                src={`http://localhost:3001${images[currentImageIndex]?.url}`}
                sx={{
                  height: 80,
                  width: 80,
                  borderRadius: 2,
                  objectFit: 'cover',
                  border: '3px solid white',
                  boxShadow: 2
                }}
                onError={(e) => {
                  console.error('Preview image failed to load:', e.currentTarget.src);
                }}
              />
              <Box sx={{ flex: 1, color: 'white' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                  Stream Orbs
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {images[currentImageIndex]?.name || 'Banner Image'}
                </Typography>
              </Box>
              {isPlaying && (
                <Box sx={{ 
                  color: 'white', 
                  background: 'rgba(0,0,0,0.3)', 
                  padding: 1, 
                  borderRadius: 2,
                  minWidth: 60,
                  textAlign: 'center'
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {formatTime(timeRemaining)}
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Image List */}
      {images.length > 0 && (
        <Card sx={{ backgroundColor: '#ffffff' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Images ({images.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {images.map((image, index) => (
                <Box key={image.id} sx={{ width: { xs: '48%', sm: '32%', md: '24%', lg: '19%' } }}>
                  <Box sx={{ 
                    position: 'relative',
                    border: currentImageIndex === index ? '2px solid #1976d2' : '1px solid #e0e0e0',
                    borderRadius: 1,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 2 }
                  }}>
                    <Box
                      component="img"
                      src={`http://localhost:3001${image.url}`}
                      onClick={() => handleImageSelect(index)}
                      sx={{
                        width: '100%',
                        height: 80,
                        objectFit: 'cover',
                        display: 'block'
                      }}
                      onError={(e) => {
                        console.error('Image list item failed to load:', e.currentTarget.src);
                      }}
                    />
                    <IconButton
                      onClick={() => handleRemoveImage(image.id)}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        '&:hover': { background: 'rgba(0,0,0,0.9)' },
                        padding: 0.5
                      }}
                      size="small"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    <Typography
                      variant="caption"
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: 0.5,
                        fontSize: '0.7rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {image.name}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default BannerControl;

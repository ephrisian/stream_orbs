import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  CardActions,
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
  VisibilityOff as VisibilityOffIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon
} from '@mui/icons-material';
import { API_ENDPOINTS, getUploadUrl, listUploads, deleteUpload, type UploadedFile } from '../config/api';

interface BannerImage {
  id: string;
  url: string;
  name: string;
  filename: string; // Add filename for duplicate checking
  size?: number;
  uploadDate?: string;
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
  const [allUploadedFiles, setAllUploadedFiles] = useState<UploadedFile[]>([]);
  const [settings, setSettings] = useState<BannerSettings>({
    enabled: true, // Enable banner by default
    defaultDuration: 30,
    position: 'top',
    height: 120,
    autoStart: false,
    loop: true
  });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  
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
    
    console.log('BannerControl: Syncing banner data:', bannerData);
    localStorage.setItem('bannerData', JSON.stringify(bannerData));
    
    // Notify other components of changes (for same-page updates)
    window.dispatchEvent(new CustomEvent('bannerDataChanged'));
    
    // Notify OBS page of changes (for cross-tab updates)
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'bannerData',
      newValue: JSON.stringify(bannerData),
      storageArea: localStorage
    }));
    
    if (onBannerUpdate) {
      onBannerUpdate(newSettings, newImages, currentIndex);
    }
  }, [currentImageIndex, isPlaying, timeRemaining, onBannerUpdate]);

  // Load existing images from server
  const loadExistingImages = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.listUploads);
      if (response.ok) {
        const allFiles = await response.json();
        const imageFiles = allFiles.filter((file: any) => file.type === 'image');
        
        const existingImages: BannerImage[] = imageFiles.map((file: any) => ({
          id: file.filename, // Use filename as ID for consistency
          url: file.url,
          name: file.originalName,
          filename: file.filename,
          size: file.size,
          uploadDate: file.uploadDate
        }));
        
        console.log('BannerControl: Loaded', existingImages.length, 'existing images');
        setImages(existingImages);
        syncWithObs(settings, existingImages);
      }
    } catch (error) {
      console.error('BannerControl: Error loading existing images:', error);
    }
  }, [settings, syncWithObs]);

  // Delete image from server and local state
    const loadAllUploadedFiles = useCallback(async () => {
    try {
      const files = await listUploads();
      setAllUploadedFiles(files);
    } catch (error) {
      console.error('Error loading all uploaded files:', error);
    }
  }, []);

  const addImageToBanner = useCallback((filename: string) => {
    const imageUrl = getUploadUrl(`uploads/${filename}`);
    const newImage: BannerImage = {
      id: crypto.randomUUID(),
      name: filename,
      url: imageUrl,
      filename: filename,
      duration: settings.defaultDuration
    };

    // Check for duplicates by filename
    if (!images.some(img => img.filename === filename)) {
      const updatedImages = [...images, newImage];
      setImages(updatedImages);
      syncWithObs(settings, updatedImages);
    }
  }, [images, settings, syncWithObs]);

  const deleteFileFromServer = useCallback(async (filename: string) => {
    try {
      const success = await deleteUpload(filename);
      if (success) {
        setAllUploadedFiles(prev => prev.filter(f => f.filename !== filename));
        // Also remove from banner images if it exists there
        setImages(prev => prev.filter(img => !img.url.endsWith(filename)));
        // Sync will be called by the effect when images change
      }
      return success;
    } catch (error) {
      console.error('Error deleting file from server:', error);
      return false;
    }
  }, []);

  // Add images
  const handleAddImages = useCallback(async (files: FileList) => {
    const uploadPromises = Array.from(files).map(async (file) => {
      // Check for duplicates by name and size
      const existingImage = images.find(img => 
        img.name === file.name && img.size === file.size
      );
      
      if (existingImage) {
        console.log('BannerControl: Skipping duplicate image:', file.name);
        return null; // Skip duplicate
      }
      
      const formData = new FormData();
      formData.append('gif', file); // Using 'gif' endpoint since it handles images
      
      try {
        const response = await fetch(API_ENDPOINTS.uploadGif, {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          return {
            id: result.filename, // Use filename as consistent ID
            url: result.url, // Server URL path
            name: file.name,
            filename: result.filename,
            size: file.size
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
  const handleRemoveImage = useCallback(async (imageId: string) => {
    const imageToRemove = images.find(img => img.id === imageId);
    
    if (imageToRemove && imageToRemove.filename) {
      // Delete from server first
      const deleteSuccess = await deleteFileFromServer(imageToRemove.filename);
      if (!deleteSuccess) {
        console.error('Failed to delete image from server');
        return; // Don't remove from UI if server deletion failed
      }
    }
    
    const updatedImages = images.filter(img => img.id !== imageId);
    setImages(updatedImages);
    
    // Adjust current index if needed
    if (currentImageIndex >= updatedImages.length && updatedImages.length > 0) {
      setCurrentImageIndex(updatedImages.length - 1);
    }
    
    syncWithObs(settings, updatedImages);
  }, [images, currentImageIndex, settings, syncWithObs, deleteFileFromServer]);

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
      // Restart timers for the new image
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      
      const duration = images[index]?.duration || settings.defaultDuration;
      setTimeRemaining(duration);
      
      // Restart countdown
      countdownRef.current = setInterval(() => {
        setTimeRemaining(prev => prev <= 1 ? 0 : prev - 1);
      }, 1000);
      
      // Restart image rotation timer
      timerRef.current = setInterval(() => {
        setCurrentImageIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % images.length;
          const nextDuration = images[nextIndex]?.duration || settings.defaultDuration;
          setTimeRemaining(nextDuration);
          return nextIndex;
        });
      }, duration * 1000);
    }
    syncWithObs(settings, images, index);
  }, [isPlaying, images, settings, syncWithObs]);

  // Navigate to next image
  const handleNextImage = useCallback(() => {
    if (images.length === 0) return;
    const nextIndex = (currentImageIndex + 1) % images.length;
    handleImageSelect(nextIndex);
  }, [images.length, currentImageIndex, handleImageSelect]);

  // Navigate to previous image
  const handlePrevImage = useCallback(() => {
    if (images.length === 0) return;
    const prevIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
    handleImageSelect(prevIndex);
  }, [images.length, currentImageIndex, handleImageSelect]);

  // Update individual image duration
  const handleImageDurationChange = useCallback((imageId: string, newDuration: number) => {
    const updatedImages = images.map(img => 
      img.id === imageId ? { ...img, duration: newDuration } : img
    );
    setImages(updatedImages);
    syncWithObs(settings, updatedImages);
  }, [images, settings, syncWithObs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      images.forEach(img => URL.revokeObjectURL(img.url));
    };
  }, []);

  // Initial sync when component mounts
  useEffect(() => {
    console.log('BannerControl: Initial sync with settings:', settings);
    syncWithObs(settings, images);
  }, [syncWithObs]); // Run when syncWithObs is ready

  // Load existing images on mount
  useEffect(() => {
    loadExistingImages();
    loadAllUploadedFiles();
  }, [loadExistingImages, loadAllUploadedFiles]);

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
            
            {/* Height Presets */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button
                size="small"
                variant={settings.height === 80 ? "contained" : "outlined"}
                onClick={() => handleSettingsChange({ height: 80 })}
                sx={{ minWidth: 'auto', px: 1, fontSize: '0.7rem' }}
              >
                80px
              </Button>
              <Button
                size="small"
                variant={settings.height === 120 ? "contained" : "outlined"}
                onClick={() => handleSettingsChange({ height: 120 })}
                sx={{ minWidth: 'auto', px: 1, fontSize: '0.7rem' }}
              >
                120px
              </Button>
              <Button
                size="small"
                variant={settings.height === 200 ? "contained" : "outlined"}
                onClick={() => handleSettingsChange({ height: 200 })}
                sx={{ minWidth: 'auto', px: 1, fontSize: '0.7rem' }}
              >
                200px
              </Button>
            </Box>
            
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

            {/* Navigation Controls */}
            <Button
              variant="outlined"
              startIcon={<SkipPreviousIcon />}
              onClick={handlePrevImage}
              disabled={images.length === 0}
              size="small"
            >
              Previous
            </Button>

            <Button
              variant="outlined"
              startIcon={<SkipNextIcon />}
              onClick={handleNextImage}
              disabled={images.length === 0}
              size="small"
            >
              Next
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

      {/* Image Library Management */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Image Library ({allUploadedFiles.length} files)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            All uploaded images. Click "Add to Banner" to include in carousel, or "Delete" to remove permanently.
          </Typography>
          
          {allUploadedFiles.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              No uploaded images found. Upload some images above to get started.
            </Typography>
          ) : (
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 2,
              mt: 2
            }}>
              {allUploadedFiles.map((file) => (
                <Card 
                  key={file.filename} 
                  variant="outlined"
                  sx={{ 
                    border: images.some(img => img.filename === file.filename) ? '2px solid #4caf50' : undefined,
                    backgroundColor: images.some(img => img.filename === file.filename) ? '#e8f5e8' : undefined
                  }}
                >
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      component="img"
                      src={getUploadUrl(`uploads/${file.filename}`)}
                      sx={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        display: 'block'
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    {images.some(img => img.filename === file.filename) && (
                      <Chip
                        label="In Banner"
                        size="small"
                        color="success"
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          fontSize: '0.7rem'
                        }}
                      />
                    )}
                  </Box>
                  <CardContent sx={{ p: 1 }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        mb: 1,
                        fontSize: '0.75rem'
                      }}
                      title={file.filename}
                    >
                      {file.filename}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ p: 1, pt: 0 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={images.some(img => img.filename === file.filename)}
                      onClick={() => addImageToBanner(file.filename)}
                      sx={{ fontSize: '0.7rem', minWidth: 'auto', px: 1 }}
                    >
                      {images.some(img => img.filename === file.filename) ? 'Added' : 'Add to Banner'}
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deleteFileFromServer(file.filename)}
                      sx={{ ml: 'auto' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}
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
                src={getUploadUrl(images[currentImageIndex]?.url)}
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
                      src={getUploadUrl(image.url)}
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
                  
                  {/* Duration Control */}
                  <Box sx={{ p: 0.5 }}>
                    <TextField
                      size="small"
                      type="number"
                      label="Duration (s)"
                      value={image.duration}
                      onChange={(e) => handleImageDurationChange(image.id, parseInt(e.target.value) || settings.defaultDuration)}
                      sx={{ 
                        '& .MuiInputBase-root': { 
                          fontSize: '0.75rem',
                          height: '32px'
                        },
                        '& .MuiInputLabel-root': { 
                          fontSize: '0.7rem',
                          transform: 'translate(8px, 6px) scale(1)'
                        },
                        '& .MuiInputLabel-shrink': {
                          transform: 'translate(8px, -6px) scale(0.75)'
                        }
                      }}
                      inputProps={{ 
                        min: 1, 
                        max: 300,
                        step: 1,
                        style: { fontSize: '0.75rem', padding: '4px 8px' }
                      }}
                      fullWidth
                    />
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

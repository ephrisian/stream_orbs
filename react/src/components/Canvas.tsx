import React, { useRef, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { getUploadUrl } from '../config/api';

interface CanvasProps {
  onAnimationStart?: (canvas: HTMLCanvasElement) => void;
  backgroundColor?: string;
  width?: number;
  height?: number;
  showBorder?: boolean;
}

interface BannerData {
  settings: {
    enabled: boolean;
    defaultDuration: number;
    height: number;
  };
  images: Array<{
    id: string;
    name: string;
    url: string;
  }>;
  currentIndex: number;
  timeRemaining: number;
  isPlaying: boolean;
}

const CANVAS_WIDTH = 405;
const CANVAS_HEIGHT = 720;

export const Canvas: React.FC<CanvasProps> = ({ 
  onAnimationStart, 
  backgroundColor = '#00ff00',
  width = CANVAS_WIDTH, 
  height = CANVAS_HEIGHT, 
  showBorder = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bannerData, setBannerData] = useState<BannerData | null>(null);
  const [bannerCurrentImage, setBannerCurrentImage] = useState(0);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas background color
    canvas.style.backgroundColor = backgroundColor;
    
    // Start animation if callback provided
    if (onAnimationStart) {
      onAnimationStart(canvas);
    }
  }, [onAnimationStart, backgroundColor]);

  // Banner management - listens for banner data from admin controls
  useEffect(() => {
    const updateBannerFromStorage = () => {
      try {
        const bannerDataStr = localStorage.getItem('bannerData');
        console.log('Canvas: Banner data from localStorage:', bannerDataStr);
        
        if (bannerDataStr) {
          const data = JSON.parse(bannerDataStr);
          console.log('Canvas: Parsed banner data:', data);
          setBannerData(data);
          
          if (data.settings?.enabled && data.images?.length > 0) {
            setBannerCurrentImage(data.currentIndex || 0);
            console.log('Canvas: Banner enabled with', data.images.length, 'images');
            
            // If admin is playing, sync our slideshow
            if (data.isPlaying) {
              console.log('Canvas: Starting banner slideshow');
              // Clear existing timer
              if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
              
              // Start image rotation
              bannerTimerRef.current = setInterval(() => {
                setBannerCurrentImage(prevIndex => (prevIndex + 1) % data.images.length);
              }, (data.settings.defaultDuration || 30) * 1000);
            } else {
              // Stop timer if admin stopped
              if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
            }
          } else {
            console.log('Canvas: Banner disabled or no images');
          }
        } else {
          console.log('Canvas: No banner data found in localStorage');
        }
      } catch (error) {
        console.error('Canvas: Error processing banner data:', error);
      }
    };

    // Initial load
    updateBannerFromStorage();

    // Listen for localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bannerData') {
        console.log('Canvas: Banner data changed via storage event');
        updateBannerFromStorage();
      }
    };

    // Listen for custom events (for same-page updates)
    const handleBannerUpdate = () => {
      console.log('Canvas: Banner data changed via custom event');
      updateBannerFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('bannerDataChanged', handleBannerUpdate);

    // Poll for changes every 2 seconds as backup
    const bannerPollInterval = setInterval(updateBannerFromStorage, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('bannerDataChanged', handleBannerUpdate);
      clearInterval(bannerPollInterval);
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    };
  }, []);

  return (
    <Box
      sx={{
        width,
        height,
        background: showBorder ? '#fff' : 'transparent',
        borderRadius: showBorder ? 2 : 0,
        boxShadow: showBorder ? 2 : 0,
        p: showBorder ? 2 : 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      <div
        style={{
          position: 'relative',
          width,
          height
        }}
      >
        {/* Banner Display - Clean carousel without timer info */}
        {bannerData?.settings?.enabled && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: `${bannerData.settings.height || 60}px`,
            background: bannerData?.images?.length > 0 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'linear-gradient(135deg, #999 0%, #666 100%)',
            borderRadius: showBorder ? '4px 4px 0 0' : '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            overflow: 'hidden',
          }}>
            {bannerData?.images?.length > 0 && bannerData.images[bannerCurrentImage] ? (
              <img 
                src={getUploadUrl(bannerData.images[bannerCurrentImage].url)}
                alt={`Banner ${bannerCurrentImage + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
                onError={(e) => {
                  console.error('Banner image failed to load:', e.currentTarget.src);
                }}
              />
            ) : (
              <div style={{
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
              }}>
                Banner Ready - Upload Images
              </div>
            )}
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            display: 'block',
            backgroundColor,
            border: showBorder ? '1px solid #ddd' : 'none',
            borderRadius: showBorder ? '0 0 4px 4px' : '0',
            marginTop: bannerData?.settings?.enabled ? '60px' : '0',
          }}
        />
      </div>
    </Box>
  );
};

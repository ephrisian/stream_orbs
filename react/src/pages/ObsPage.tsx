import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useOrbManager } from '../hooks/useOrbManager';

export const ObsPage: React.FC = () => {
  const backgroundColor = '#00ff00';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [orbsLoaded, setOrbsLoaded] = useState(false);
  
  const {
    orbs,
    addOrb,
    updateOrb,
    clearAllOrbs,
    explodeOrbs,
    startAnimation
  } = useOrbManager();

  console.log('OBS Page - Current orbs count:', orbs.length);

  // GIF display system for OBS - listens for triggers from admin page
  useEffect(() => {
    console.log('OBS: Setting up GIF display system...');
    console.log('OBS: User agent:', navigator.userAgent);
    console.log('OBS: Is OBS Browser Source:', navigator.userAgent.includes('obs-browser'));
    const activeGIFs: HTMLImageElement[] = [];

    const applyGifPosition = (img: HTMLImageElement, position: string) => {
      const pos = position || 'bottom-left';
      img.style.position = 'absolute';
      img.style.zIndex = '1000';
      img.style.maxHeight = '200px';
      img.style.pointerEvents = 'none';

      switch (pos) {
        case 'top-left':
          img.style.top = '10px';
          img.style.left = '10px';
          break;
        case 'top-right':
          img.style.top = '10px';
          img.style.right = '10px';
          break;
        case 'bottom-right':
          img.style.bottom = '10px';
          img.style.right = '10px';
          break;
        case 'center':
          img.style.top = '50%';
          img.style.left = '50%';
          img.style.transform = 'translate(-50%, -50%)';
          break;
        default:
          img.style.bottom = '10px';
          img.style.left = '10px';
      }
    };

    const showGif = (trigger: any) => {
      console.log('OBS: showGif called with trigger:', JSON.stringify(trigger, null, 2));
      const gifSrc = trigger.gifUrl;
      console.log('OBS: gifSrc from gifUrl:', trigger.gifUrl);
      console.log('OBS: Final gifSrc:', gifSrc);
      
      if (!gifSrc || !gifSrc.trim()) {
        console.log('OBS: No GIF source found');
        return;
      }

      if (activeGIFs.length > 0) {
        console.warn('GIF already active');
        return;
      }

      const stage = document.getElementById('stage');
      if (!stage) {
        console.warn('No stage element found');
        return;
      }

      const img = document.createElement('img');
      img.src = gifSrc;
      img.style.opacity = '1';
      img.style.transition = 'opacity 0.5s ease';
      
      // Add error handling for the image
      img.onerror = () => {
        console.error('OBS: Failed to load GIF:', gifSrc);
      };
      
      img.onload = () => {
        console.log('OBS: GIF loaded successfully:', gifSrc);
      };

      applyGifPosition(img, trigger.gifPosition);

      stage.appendChild(img);
      activeGIFs.push(img);

      console.log('GIF element added to OBS stage');

      setTimeout(() => {
        img.style.opacity = '0';
        setTimeout(() => {
          img.remove();
          const index = activeGIFs.indexOf(img);
          if (index !== -1) activeGIFs.splice(index, 1);
        }, 500);
      }, 3500);
    };

    // Poll for GIF triggers from admin page
    const checkForGifTriggers = async () => {
      try {
        const gifTrigger = localStorage.getItem('pendingGifTrigger');
        if (gifTrigger) {
          console.log('OBS: Found pending GIF trigger');
          const trigger = JSON.parse(gifTrigger);
          localStorage.removeItem('pendingGifTrigger'); // Clear the trigger
          showGif(trigger);
        }
      } catch (error) {
        console.error('OBS: Error checking for GIF triggers:', error);
      }
    };

    // Check for triggers every 100ms for responsiveness
    const triggerInterval = setInterval(checkForGifTriggers, 100);

    return () => {
      console.log('OBS: Cleaning up GIF display system');
      clearInterval(triggerInterval);
      activeGIFs.forEach(img => img.remove());
    };
  }, []);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    console.log('OBS: Starting animation with canvas:', canvas.width, 'x', canvas.height);
    startAnimation(canvas);
  }, [startAnimation]);

  // Orb loading with periodic updates
  useEffect(() => {
    console.log('OBS: Effect mounting...');
    let lastOrbsData: any[] = [];
    let orbIdentityToIdMap = new Map<string, string>(); // Maps orb identity to actual orb ID
    
    const updateOrbs = (newOrbs: any[]) => {
      console.log('OBS: Updating orbs...');
      
      // Create stable identifiers for orbs based on core identity (not changeable properties)
      const getOrbIdentity = (orb: any) => `${orb.imgSrc}-${orb.label}-${orb.entryType}-${orb.role}`;
      
      // Create maps of current and new orbs by identity
      const currentOrbsByIdentity = new Map();
      lastOrbsData.forEach(orb => {
        currentOrbsByIdentity.set(getOrbIdentity(orb), orb);
      });
      
      const newOrbsByIdentity = new Map();
      newOrbs.forEach(orb => {
        newOrbsByIdentity.set(getOrbIdentity(orb), orb);
      });
      
      // Find orbs that were added or removed
      const currentIdentities = new Set(currentOrbsByIdentity.keys());
      const newIdentities = new Set(newOrbsByIdentity.keys());
      
      const addedIdentities = [...newIdentities].filter(id => !currentIdentities.has(id));
      const removedIdentities = [...currentIdentities].filter(id => !newIdentities.has(id));
      
      if (addedIdentities.length > 0 || removedIdentities.length > 0) {
        // Orbs were added or removed - rebuild everything
        console.log(`OBS: Rebuilding - Added: ${addedIdentities.length}, Removed: ${removedIdentities.length}`);
        clearAllOrbs();
        orbIdentityToIdMap.clear();
        
        newOrbs.forEach((apiOrb: any, index: number) => {
          console.log(`Adding orb ${index + 1}:`, apiOrb.label || 'No label');
          const orb = addOrb({
            imgSrc: apiOrb.imgSrc,
            entryType: apiOrb.entryType,
            role: apiOrb.role,
            label: apiOrb.label,
            ringColor: apiOrb.ringColor,
            ringWidth: apiOrb.ringWidth,
            roleIcon: apiOrb.roleIcon,
            roleIconPosition: apiOrb.roleIconPosition,
            size: apiOrb.size
          });
          orbIdentityToIdMap.set(getOrbIdentity(apiOrb), orb.id);
        });
      } else {
        // Check for property changes and update in place
        let hasUpdates = false;
        [...newIdentities].forEach(identity => {
          const current = currentOrbsByIdentity.get(identity);
          const updated = newOrbsByIdentity.get(identity);
          
          if (JSON.stringify(current) !== JSON.stringify(updated)) {
            const orbId = orbIdentityToIdMap.get(identity);
            if (orbId) {
              console.log(`Updating properties for orb: ${updated.label || 'No label'}`);
              updateOrb(orbId, {
                ringColor: updated.ringColor,
                ringWidth: updated.ringWidth,
                roleIcon: updated.roleIcon,
                roleIconPosition: updated.roleIconPosition,
                size: updated.size,
                // Note: Can't update core properties like imgSrc, label, entryType, role 
                // as those are part of the identity
              });
              hasUpdates = true;
            }
          }
        });
        
        if (hasUpdates) {
          console.log('OBS: Updated orb properties in place');
        }
      }
      
      lastOrbsData = [...newOrbs];
    };
    
    const loadOrbsFromAPI = async () => {
      try {
        console.log('OBS: Polling API for orbs...');
        const response = await fetch('http://192.168.68.68:3001/api/orbs');
        if (response.ok) {
          const apiOrbs = await response.json();
          console.log(`OBS: API returned ${apiOrbs.length} orbs`);
          
          // Check if data has actually changed
          const currentOrbsJSON = JSON.stringify(apiOrbs);
          const lastOrbsJSON = JSON.stringify(lastOrbsData);
          
          if (currentOrbsJSON === lastOrbsJSON) {
            console.log('OBS: No changes detected, skipping update');
            return;
          }
          
          console.log('OBS: Data changed, updating orbs');
          updateOrbs(apiOrbs);
          
        } else {
          console.log('OBS: API failed, checking localStorage');
          const savedOrbs = localStorage.getItem('orbData');
          if (savedOrbs) {
            const parsed = JSON.parse(savedOrbs);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`OBS: Loaded ${parsed.length} orbs from localStorage`);
              
              const currentOrbsJSON = JSON.stringify(parsed);
              const lastOrbsJSON = JSON.stringify(lastOrbsData);
              
              if (currentOrbsJSON === lastOrbsJSON) {
                console.log('OBS: No changes in localStorage, skipping update');
                return;
              }
              
              updateOrbs(parsed);
            }
          }
        }
      } catch (error) {
        console.error('OBS: Error loading orbs:', error);
      } finally {
        setOrbsLoaded(true);
      }
    };

    // Initial load
    loadOrbsFromAPI();

    // Set up polling every 2 seconds for live updates
    console.log('OBS: Setting up polling interval...');
    const pollInterval = setInterval(() => {
      console.log('OBS: Interval triggered');
      loadOrbsFromAPI();
    }, 2000);

    return () => {
      console.log('OBS: Cleaning up polling interval');
      clearInterval(pollInterval);
    };
  }, [addOrb, updateOrb, clearAllOrbs]); // Add dependencies

  // Initialize canvas when orbs are loaded
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && orbsLoaded) {
      console.log('OBS: Starting animation on canvas');
      handleCanvasReady(canvas);
    }

    // Override root and body styles for OBS
    const rootElement = document.getElementById('root');
    const bodyElement = document.body;
    const htmlElement = document.documentElement;

    // Store original styles
    const originalRootStyle = rootElement?.style.cssText || '';
    const originalBodyStyle = bodyElement.style.cssText || '';
    const originalHtmlStyle = htmlElement.style.cssText || '';

    // Apply OBS styles
    if (rootElement) {
      rootElement.style.cssText = 'margin: 0 !important; padding: 0 !important; width: 405px !important; height: 720px !important; max-width: none !important; text-align: left !important;';
    }
    bodyElement.style.cssText = 'margin: 0 !important; padding: 0 !important; width: 405px !important; height: 720px !important; overflow: hidden !important; background: transparent !important;';
    htmlElement.style.cssText = 'margin: 0 !important; padding: 0 !important; width: 405px !important; height: 720px !important; overflow: hidden !important;';

    // Cleanup when component unmounts
    return () => {
      if (rootElement) {
        rootElement.style.cssText = originalRootStyle;
      }
      bodyElement.style.cssText = originalBodyStyle;
      htmlElement.style.cssText = originalHtmlStyle;
    };
  }, [handleCanvasReady, orbsLoaded]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    console.log('OBS: Explosion triggered at', x, y);
    explodeOrbs(x, y, 20);
  }, [explodeOrbs]);

  return (
    <div 
      id="stage"
      style={{ 
        width: '405px', 
        height: '720px', 
        margin: 0,
        padding: 0,
        display: 'block',
        position: 'relative',
        backgroundColor: backgroundColor
      }}
    >
      <canvas 
        ref={canvasRef}
        width={405}
        height={720}
        onClick={handleCanvasClick}
        style={{ 
          display: 'block',
          margin: 0,
          padding: 0,
          backgroundColor: backgroundColor,
          position: 'absolute',
          top: 0,
          left: 0,
          cursor: 'crosshair'
        }} 
      />
    </div>
  );
};

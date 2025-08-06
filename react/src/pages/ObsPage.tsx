import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useOrbManager } from '../hooks/useOrbManager';
import { useOrbApi } from '../hooks/useOrbApi';

export const ObsPage: React.FC = () => {
  const backgroundColor = '#00ff00';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [orbsLoaded, setOrbsLoaded] = useState(false);
  
  const {
    orbs,
    addOrb,
    clearAllOrbs,
    startAnimation
  } = useOrbManager();

  const {
    orbs: apiOrbs,
    fetchOrbs
  } = useOrbApi();

  const orbsAreEqual = (currentOrbs: any[], newOrbs: any[]): boolean => {
    if (currentOrbs.length !== newOrbs.length) return false;
    
    return currentOrbs.every((currentOrb, index) => {
      const newOrb = newOrbs[index];
      return (
        currentOrb.imgSrc === newOrb.imgSrc &&
        currentOrb.label === newOrb.label &&
        currentOrb.entryType === newOrb.entryType &&
        currentOrb.role === newOrb.role
      );
    });
  };

  console.log('OBS Page - Current orbs count:', orbs.length);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    console.log('OBS: Starting animation with canvas:', canvas.width, 'x', canvas.height);
    startAnimation(canvas);
  }, [startAnimation]);

  // Load orbs from API on mount and poll for changes
  useEffect(() => {
    console.log('ObsPage mounted');
    
    // Better OBS detection
    const isOBS = !!(window as any).obsstudio || 
                 navigator.userAgent.includes('OBS') || 
                 window.name === 'OBSBrowserSource' ||
                 window.location.search.includes('obs=true');
                 
    console.log('Environment detection:', {
      obsstudio: !!(window as any).obsstudio,
      userAgent: navigator.userAgent,
      windowName: window.name,
      isOBS: isOBS
    });

    let lastOrbCount = -1;

    const loadOrbs = async () => {
      try {
        console.log('Fetching orbs from API...');
        await fetchOrbs();
        
        // Check if API orbs have changed
        if (apiOrbs.length === lastOrbCount && orbsLoaded) {
          return;
        }
        
        lastOrbCount = apiOrbs.length;
        console.log(`API orbs changed, reloading. Count: ${apiOrbs.length}`);
        
        if (apiOrbs.length > 0) {
          // Check if current orbs match the API ones to avoid unnecessary recreation
          const currentOrbsData = orbs.map(orb => ({
            imgSrc: orb.imgSrc,
            label: orb.label,
            entryType: orb.entryType,
            role: orb.role
          }));
          
          const apiOrbsData = apiOrbs.map(orb => ({
            imgSrc: orb.imgSrc,
            label: orb.label,
            entryType: orb.entryType,
            role: orb.role
          }));
          
          if (orbsAreEqual(currentOrbsData, apiOrbsData) && orbsLoaded) {
            console.log('Orbs are already up to date, skipping reload');
            return;
          }
          
          console.log(`Loading ${apiOrbs.length} orbs from API into OBS view`);
          // Clear existing orbs first
          clearAllOrbs();
          
          // Add each orb
          apiOrbs.forEach((apiOrb, index) => {
            console.log(`Adding orb ${index + 1}:`, apiOrb);
            addOrb({
              imgSrc: apiOrb.imgSrc,
              entryType: apiOrb.entryType,
              role: apiOrb.role,
              label: apiOrb.label,
              ringColor: apiOrb.ringColor,
              ringWidth: apiOrb.ringWidth,
              roleIcon: apiOrb.roleIcon,
              size: apiOrb.size
            });
          });
          
          setOrbsLoaded(true);
          console.log('All orbs loaded from API into OBS view');
        } else {
          console.log('No orbs found in API, clearing existing');
          if (orbs.length > 0) {
            clearAllOrbs();
          }
          setOrbsLoaded(true);
        }
      } catch (error) {
        console.error('Error loading orbs from API:', error);
        
        // Fallback to localStorage if API fails
        console.log('Falling back to localStorage...');
        try {
          const savedOrbs = localStorage.getItem('orbData');
          if (savedOrbs) {
            const parsed = JSON.parse(savedOrbs);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`Loading ${parsed.length} orbs from localStorage fallback`);
              clearAllOrbs();
              
              parsed.forEach((savedOrb, index) => {
                console.log(`Adding fallback orb ${index + 1}:`, savedOrb);
                addOrb({
                  imgSrc: savedOrb.imgSrc,
                  entryType: savedOrb.entryType,
                  role: savedOrb.role,
                  label: savedOrb.label,
                  ringColor: savedOrb.ringColor,
                  ringWidth: savedOrb.ringWidth,
                  roleIcon: savedOrb.roleIcon,
                  size: savedOrb.size
                });
              });
            }
          }
        } catch (fallbackError) {
          console.error('Fallback to localStorage also failed:', fallbackError);
        }
        
        setOrbsLoaded(true);
      }
    };

    // Initial load
    loadOrbs();

    // Set up polling for changes (every 3 seconds for API)
    const pollInterval = setInterval(() => {
      loadOrbs();
    }, 3000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [addOrb, clearAllOrbs, fetchOrbs, apiOrbs, orbs, orbsLoaded]);

  // Initialize canvas when component mounts and orbs are loaded
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && orbsLoaded) {
      console.log('Starting animation on OBS canvas');
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

  return (
    <div style={{ 
      width: '405px', 
      height: '720px', 
      margin: 0,
      padding: 0,
      display: 'block',
      position: 'relative',
      backgroundColor: backgroundColor
    }}>
      <canvas 
        ref={canvasRef}
        width={405}
        height={720}
        style={{ 
          display: 'block',
          margin: 0,
          padding: 0,
          backgroundColor: backgroundColor,
          position: 'absolute',
          top: 0,
          left: 0
        }} 
      />
    </div>
  );
};

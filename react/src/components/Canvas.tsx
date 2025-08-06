import React, { useRef, useEffect } from 'react';
import Box from '@mui/material/Box';

interface CanvasProps {
  onAnimationStart?: (canvas: HTMLCanvasElement) => void;
  backgroundColor?: string;
  width?: number;
  height?: number;
  showBorder?: boolean;
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

  return (
    <Box
      sx={{
        width,
        height,
        background: showBorder ? '#fff' : 'transparent',
        borderRadius: showBorder ? 2 : 0,
        boxShadow: showBorder ? 2 : 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: showBorder ? 3 : 0,
        margin: 0
      }}
    >
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        style={{ 
          display: 'block', 
          borderRadius: showBorder ? 8 : 0,
          backgroundColor: backgroundColor,
          margin: 0,
          padding: 0
        }} 
      />
    </Box>
  );
};

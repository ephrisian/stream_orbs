import React, { useRef, useEffect } from 'react';
import Box from '@mui/material/Box';

interface CanvasProps {
  orbs: any[];
  width?: number;
  height?: number;
  showBorder?: boolean;
}

const CANVAS_WIDTH = 405;
const CANVAS_HEIGHT = 720;

export const Canvas: React.FC<CanvasProps> = ({ orbs, width = CANVAS_WIDTH, height = CANVAS_HEIGHT, showBorder = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (const orb of orbs) {
      // Draw orb (placeholder, real logic will be ported)
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.size || 32, 0, Math.PI * 2);
      ctx.fillStyle = orb.ringColor || '#1976d2';
      ctx.fill();
      ctx.closePath();
    }
  }, [orbs, width, height]);

  return (
    <Box
      sx={{
        width,
        height,
        background: '#f5f6fa',
        borderRadius: 2,
        boxShadow: showBorder ? 2 : 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block', background: '#fff', borderRadius: 8 }} />
    </Box>
  );
};

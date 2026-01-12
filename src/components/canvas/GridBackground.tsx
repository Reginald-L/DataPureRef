import React from 'react';
import { Viewport } from '../../types/canvas';

interface GridBackgroundProps {
  viewport: Viewport;
}

export const GridBackground: React.FC<GridBackgroundProps> = ({ viewport }) => {
  const gridSize = 50 * viewport.zoom;
  const backgroundSize = `${gridSize}px ${gridSize}px`;
  const backgroundPosition = `${viewport.x}px ${viewport.y}px`;

  return (
    <div 
      className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10 bg-[#1a1a1a]"
      style={{
        backgroundImage: `
          linear-gradient(to right, #333 1px, transparent 1px),
          linear-gradient(to bottom, #333 1px, transparent 1px)
        `,
        backgroundSize,
        backgroundPosition
      }}
    />
  );
};

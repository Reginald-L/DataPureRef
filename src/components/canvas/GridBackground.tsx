import React from 'react';
import { Viewport } from '../../types/canvas';

interface GridBackgroundProps {
  viewport: Viewport;
}

export const GridBackground: React.FC<GridBackgroundProps> = ({ viewport }) => {
  const majorGridSize = 144 * viewport.zoom;
  const dotGridSize = 28 * viewport.zoom;
  const microDotSize = 14 * viewport.zoom;
  const majorBackgroundSize = `${majorGridSize}px ${majorGridSize}px`;
  const dotBackgroundSize = `${dotGridSize}px ${dotGridSize}px`;
  const microDotBackgroundSize = `${microDotSize}px ${microDotSize}px`;
  const backgroundPosition = [
    `${viewport.x * 0.18}px ${viewport.y * 0.18}px`,
    `${viewport.x}px ${viewport.y}px`,
    `${viewport.x}px ${viewport.y}px`,
    `${viewport.x * 0.55}px ${viewport.y * 0.55}px`,
    'center',
    'center',
  ].join(', ');

  return (
    <div 
      className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10"
      style={{
        backgroundColor: '#050c16',
        backgroundImage: `
          radial-gradient(circle, rgba(148, 163, 184, 0.12) 0.7px, transparent 1px),
          radial-gradient(circle, rgba(96, 165, 250, 0.16) 1px, transparent 1.35px),
          linear-gradient(to right, rgba(59, 130, 246, 0.08) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(59, 130, 246, 0.08) 1px, transparent 1px),
          radial-gradient(circle at 18% 12%, rgba(56, 189, 248, 0.12), transparent 28%),
          radial-gradient(circle at 82% 4%, rgba(37, 99, 235, 0.18), transparent 34%)
        `,
        backgroundSize: `${microDotBackgroundSize}, ${dotBackgroundSize}, ${majorBackgroundSize}, ${majorBackgroundSize}, 100% 100%, 100% 100%`,
        backgroundPosition
      }}
    />
  );
};

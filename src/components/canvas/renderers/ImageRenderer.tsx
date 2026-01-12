import React from 'react';
import { ImageObject } from '../../../types/canvas';

interface ImageRendererProps {
  object: ImageObject;
}

export const ImageRenderer: React.FC<ImageRendererProps> = ({ object }) => {
  return (
    <div className="w-full h-full">
      <img
        src={object.src}
        alt={object.alt || 'Canvas image'}
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
    </div>
  );
};

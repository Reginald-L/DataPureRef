import React from 'react';
import { VideoObject } from '../../../types/canvas';

interface VideoRendererProps {
  object: VideoObject;
}

export const VideoRenderer: React.FC<VideoRendererProps> = ({ object }) => {
  return (
    <div className="w-full h-full bg-black">
      <video
        src={object.src}
        className="w-full h-full object-contain"
        controls
      />
    </div>
  );
};

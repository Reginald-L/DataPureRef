import React, { useState } from 'react';
import { VideoObject } from '../../../types/canvas';
import { Play } from 'lucide-react';

interface VideoRendererProps {
  object: VideoObject;
}

export const VideoRenderer: React.FC<VideoRendererProps> = ({ object }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!isPlaying && object.thumbnail) {
    return (
      <div 
        className="w-full h-full bg-black relative group cursor-pointer"
        onClick={(e) => {
            e.stopPropagation(); // Prevent drag start if needed, but we want drag... 
            // Actually, clicking usually selects. Double click or specific button?
            // If we are in "select/drag" mode, a single click selects.
            // But here we want to PLAY.
            // Maybe a specific play button overlay?
            setIsPlaying(true);
        }}
        // We need to ensure this doesn't conflict with parent drag handlers.
        // The parent CanvasObjectRenderer handles pointerDown.
        // A click here will bubble up.
      >
        <img 
          src={object.thumbnail} 
          className="w-full h-full object-contain pointer-events-none" 
          alt="Video thumbnail"
          draggable={false}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
           <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-colors">
             <Play className="w-8 h-8 text-white fill-white" />
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black">
      <video
        src={object.src}
        className="w-full h-full object-contain"
        controls
        autoPlay={isPlaying}
        onPause={() => {
            // Optional: revert to thumbnail on pause? Probably annoying. Keep video player.
        }}
      />
    </div>
  );
};

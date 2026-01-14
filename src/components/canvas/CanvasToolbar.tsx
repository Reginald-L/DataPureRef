import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';

export const CanvasToolbar: React.FC = () => {
  const viewport = useCanvasStore((state) => state.viewport);
  const zoomCanvas = useCanvasStore((state) => state.zoomCanvas);

  const handleZoomIn = () => zoomCanvas(1.1);
  const handleZoomOut = () => zoomCanvas(0.9);

  return (
    <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-white rounded-full shadow-lg px-3 py-1.5 text-gray-700 select-none">
      <button 
        onClick={handleZoomOut}
        className="p-1 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
        title="Zoom Out"
      >
        <Minus size={14} />
      </button>
      
      <span className="text-sm font-medium min-w-[3rem] text-center">
        {Math.round(viewport.zoom * 100)}%
      </span>
      
      <button 
        onClick={handleZoomIn}
        className="p-1 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
        title="Zoom In"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};

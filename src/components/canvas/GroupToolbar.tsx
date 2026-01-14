import React from 'react';
import { AlignLeft, AlignCenter, AlignRight, Ungroup } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';

export const GroupToolbar: React.FC = () => {
  const selectedObjectIds = useCanvasStore((state) => state.selectedObjectIds);
  const objects = useCanvasStore((state) => state.objects);
  const ungroupObject = useCanvasStore((state) => state.ungroupObject);
  const alignGroupChildren = useCanvasStore((state) => state.alignGroupChildren);

  if (selectedObjectIds.length !== 1) return null;

  const selectedId = selectedObjectIds[0];
  const selectedObject = objects.find(o => o.id === selectedId);

  if (!selectedObject || selectedObject.type !== 'group') return null;

  return (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 bg-white rounded-lg shadow-lg px-3 py-1.5 text-gray-700 select-none border border-gray-200">
        <span className="text-xs font-semibold mr-2 text-gray-500">Group</span>
        
        <div className="h-4 w-px bg-gray-300 mx-1" />

        <button 
            onClick={() => alignGroupChildren(selectedId, 'left')} 
            className="p-1 hover:bg-gray-100 rounded transition-colors" 
            title="Align Left"
        >
            <AlignLeft size={16} />
        </button>
        <button 
            onClick={() => alignGroupChildren(selectedId, 'center')} 
            className="p-1 hover:bg-gray-100 rounded transition-colors" 
            title="Align Center"
        >
            <AlignCenter size={16} />
        </button>
        <button 
            onClick={() => alignGroupChildren(selectedId, 'right')} 
            className="p-1 hover:bg-gray-100 rounded transition-colors" 
            title="Align Right"
        >
            <AlignRight size={16} />
        </button>
        
        <div className="h-4 w-px bg-gray-300 mx-1" />
        
        <button 
            onClick={() => ungroupObject(selectedId)} 
            className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors" 
            title="Ungroup"
        >
            <Ungroup size={16} />
        </button>
    </div>
  );
};

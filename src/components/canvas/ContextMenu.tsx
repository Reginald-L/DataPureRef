import React, { useEffect } from 'react';
import { Download } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { generateExportHtml } from '../../utils/export';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose }) => {
  const { objects, viewport } = useCanvasStore();

  const handleExport = () => {
    const htmlContent = generateExportHtml(objects, viewport);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `infinite-canvas-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => onClose();
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      className="absolute bg-[#2a2a2a] border border-[#444] rounded shadow-xl py-1 z-[100] min-w-[150px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        onClick={handleExport}
        className="w-full text-left px-4 py-2 text-white hover:bg-[#3a3a3a] flex items-center gap-2 text-sm transition-colors"
      >
        <Download size={14} />
        <span>Export as HTML</span>
      </button>
      {/* Future menu items can go here */}
    </div>
  );
};

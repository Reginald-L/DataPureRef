import React from 'react';
import { Download } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { generateExportHtml } from '../../utils/export';

export const CanvasToolbar: React.FC = () => {
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
  };

  return (
    <div className="absolute top-4 right-4 z-50 flex gap-2">
      <button
        onClick={handleExport}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-lg transition-colors"
        title="Export as HTML"
      >
        <Download size={18} />
        <span>Export</span>
      </button>
    </div>
  );
};

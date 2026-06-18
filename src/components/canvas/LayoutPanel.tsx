import React, { useEffect } from 'react';
import { LayoutGrid, Sparkles, X } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { GridLayoutPicker } from './GridLayoutPicker';

export const LayoutPanel: React.FC = () => {
  const selectedObjectIds = useCanvasStore((state) => state.selectedObjectIds);
  const layoutSelectedObjects = useCanvasStore((state) => state.layoutSelectedObjects);
  const isLayoutPanelOpen = useCanvasStore((state) => state.isLayoutPanelOpen);
  const closeLayoutPanel = useCanvasStore((state) => state.closeLayoutPanel);

  useEffect(() => {
    if (selectedObjectIds.length < 2 && isLayoutPanelOpen) {
      closeLayoutPanel();
    }
  }, [selectedObjectIds.length, isLayoutPanelOpen, closeLayoutPanel]);

  if (!isLayoutPanelOpen || selectedObjectIds.length < 2) return null;

  const handleLayoutSelect = (cols: number, rows: number, gap = 20) => {
    layoutSelectedObjects(cols, rows, gap);
  };

  return (
    <div
      data-canvas-ui="true"
      className="absolute right-4 top-20 z-50 w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#20242b]/95 shadow-2xl backdrop-blur-md"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3 text-white">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-500/20 p-2 text-blue-300">
              <LayoutGrid size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold">Layout Panel</div>
              <div className="text-xs text-gray-400">
                {selectedObjectIds.length} items selected
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={closeLayoutPanel}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            title="Close Layout Panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="mb-3 rounded-xl border border-blue-400/10 bg-blue-500/5 px-3 py-2 text-xs text-gray-300">
          <div className="mb-1 flex items-center gap-2 text-blue-300">
            <Sparkles size={14} />
            <span className="font-medium">Better Workflow</span>
          </div>
          <div>Default uses `6 x 6`, and you can customize cols, rows, and gap below.</div>
        </div>

        <GridLayoutPicker onSelect={handleLayoutSelect} />
      </div>
    </div>
  );
};

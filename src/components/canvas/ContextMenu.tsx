import React, { useEffect, useState } from 'react';
import { Download, File, Plus, Trash2, Check, Group, Ungroup, ChevronRight, Pencil, Map as MapIcon, LayoutGrid, PanelRightOpen } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { generateExportHtml } from '../../utils/export';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose }) => {
  const { 
    objects, 
    viewport,
    pages,
    activePageId,
    addPage,
    switchPage,
    deletePage,
    renamePage,
    selectedObjectIds,
    groupSelected,
    ungroupObject,
    isMinimapVisible,
    toggleMinimap,
    layoutSelectedObjects,
    openLayoutPanel
  } = useCanvasStore();

  const [showPageSubmenu, setShowPageSubmenu] = useState(false);
  const [showLayoutSubmenu, setShowLayoutSubmenu] = useState(false);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');

  const handleExport = async () => {
    try {
      const blob = await generateExportHtml(objects, viewport);
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `infinite-canvas-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60_000);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      alert('导出失败，请重试');
    }
  };

  const handleAddPage = () => {
    addPage();
    onClose();
  };

  const handleSwitchPage = (pageId: string) => {
    switchPage(pageId);
    onClose();
  };

  const handleDeletePage = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    deletePage(pageId);
  };

  const handleStartRename = (e: React.MouseEvent, pageId: string, currentName: string) => {
    e.stopPropagation();
    setRenamingPageId(pageId);
    setRenamingValue(currentName);
  };

  const commitRename = () => {
    if (!renamingPageId) return;
    const trimmed = renamingValue.trim();
    renamePage(renamingPageId, trimmed || 'Untitled');
    setRenamingPageId(null);
  };

  const handleGroup = () => {
    groupSelected();
    onClose();
  };

  const handleUngroup = () => {
    if (selectedObjectIds.length === 1) {
      ungroupObject(selectedObjectIds[0]);
    }
    onClose();
  };

  const handleToggleMinimap = () => {
    toggleMinimap();
    onClose();
  };

  const handleOpenLayoutPanel = () => {
    openLayoutPanel();
    onClose();
  };

  const handleQuickLayout = () => {
    layoutSelectedObjects(6, 6, 20);
    openLayoutPanel();
    onClose();
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => onClose();
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  // Determine which group actions to show
  const showGroup = selectedObjectIds.length > 1;
  const singleSelectedObject = selectedObjectIds.length === 1 
    ? objects.find(o => o.id === selectedObjectIds[0]) 
    : null;
  const showUngroup = singleSelectedObject?.type === 'group';

  return (
    <div 
      data-canvas-ui="true"
      className="absolute min-w-[220px] rounded-2xl border border-white/10 bg-[#22252c]/95 p-1.5 shadow-2xl backdrop-blur-md z-[100]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Pages Submenu Trigger */}
      <div 
        className="relative"
        onMouseEnter={() => setShowPageSubmenu(true)}
        onMouseLeave={() => setShowPageSubmenu(false)}
      >
        <button
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-gray-200 transition-colors hover:bg-white/5"
        >
          <div className="flex items-center gap-2">
            <File size={14} />
            <span>Pages</span>
          </div>
          <ChevronRight size={14} />
        </button>

        {/* Submenu */}
        {showPageSubmenu && (
          <div 
            className="absolute left-[calc(100%-4px)] top-0 min-w-[200px] overflow-hidden rounded-2xl border border-white/10 bg-[#22252c]/95 p-1.5 shadow-2xl backdrop-blur-md"
          >
            <div className="flex max-h-[220px] flex-col gap-1 overflow-y-auto custom-scrollbar">
              {pages.map((page) => (
                <div 
                  key={page.id}
                  onClick={() => handleSwitchPage(page.id)}
                  className={`
                    w-full text-left px-3 py-2 flex items-center justify-between group rounded-xl
                    ${activePageId === page.id ? 'bg-white/6 text-blue-300' : 'text-gray-300 hover:bg-white/5'}
                    cursor-pointer transition-colors
                  `}
                >
                  {renamingPageId === page.id ? (
                    <input
                      autoFocus
                      value={renamingValue}
                      onChange={(e) => setRenamingValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setRenamingPageId(null);
                      }}
                      onBlur={commitRename}
                      className="text-sm w-[120px] bg-[#1f1f1f] text-gray-200 px-2 py-1 rounded border border-[#444] outline-none"
                    />
                  ) : (
                    <span className="text-sm truncate max-w-[120px]">{page.name}</span>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleStartRename(e, page.id, page.name)}
                      className="p-1 text-gray-500 hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                      title="Rename Page"
                    >
                      <Pencil size={12} />
                    </button>
                    {pages.length > 1 && activePageId !== page.id && (
                      <button
                        onClick={(e) => handleDeletePage(e, page.id)}
                        className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                        title="Delete Page"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    {activePageId === page.id && <Check size={12} className="text-blue-400" />}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="my-1 h-px bg-white/10" />
            
            <button
              onClick={handleAddPage}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-white/5"
            >
              <Plus size={14} className="text-gray-400" />
              <span>New Page</span>
            </button>
          </div>
        )}
      </div>

      <div className="my-1 h-px bg-white/10" />

      {/* Group Actions */}
      {(showGroup || showUngroup) && (
        <>
          {showGroup && (
            <>
            <div
              className="relative"
              onMouseEnter={() => setShowLayoutSubmenu(true)}
              onMouseLeave={() => setShowLayoutSubmenu(false)}
            >
              <button
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-gray-200 transition-colors hover:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid size={14} />
                  <span>Layout</span>
                </div>
                <ChevronRight size={14} />
              </button>

              {showLayoutSubmenu && (
                <div className="absolute left-[calc(100%-4px)] top-0 min-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-[#22252c]/95 p-1.5 shadow-2xl backdrop-blur-md">
                  <button
                    onClick={handleOpenLayoutPanel}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-white/5"
                  >
                    <PanelRightOpen size={14} />
                    <span>Open Layout Panel</span>
                  </button>
                  <button
                    onClick={handleQuickLayout}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-white/5"
                  >
                    <LayoutGrid size={14} />
                    <span>Quick 6 x 6</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleGroup}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-white/5"
            >
              <Group size={14} />
              <span>Group Selection</span>
            </button>
            </>
          )}
          
          {showUngroup && (
            <button
              onClick={handleUngroup}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-white/5"
            >
              <Ungroup size={14} />
              <span>Ungroup</span>
            </button>
          )}
          <div className="my-1 h-px bg-white/10" />
        </>
      )}

      {/* Export */}
      <button
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-white/5"
        onClick={handleExport}
      >
        <Download size={14} />
        <span>Export HTML</span>
      </button>

      <div className="my-1 h-px bg-white/10" />

      {/* Toggle Minimap */}
      <button
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-white/5"
        onClick={handleToggleMinimap}
      >
        <MapIcon size={14} />
        <span>{isMinimapVisible ? 'Hide Minimap' : 'Show Minimap'}</span>
      </button>
    </div>
  );
};

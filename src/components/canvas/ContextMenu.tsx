import React, { useEffect, useState } from 'react';
import { Download, File, Plus, Trash2, Check, Group, Ungroup, ChevronRight, Pencil, Map as MapIcon } from 'lucide-react';
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
    toggleMinimap
  } = useCanvasStore();

  const [showPageSubmenu, setShowPageSubmenu] = useState(false);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');

  const handleExport = async () => {
    try {
      const htmlContent = await generateExportHtml(objects, viewport);
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
      className="absolute bg-[#2a2a2a] border border-[#444] rounded-lg shadow-xl py-1 z-[100] min-w-[200px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Pages Submenu Trigger */}
      <div 
        className="relative"
        onMouseEnter={() => setShowPageSubmenu(true)}
        onMouseLeave={() => setShowPageSubmenu(false)}
      >
        <button
          className="w-full text-left px-3 py-1.5 text-gray-300 hover:bg-[#3a3a3a] flex items-center justify-between text-sm transition-colors"
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
            className="absolute left-full top-0 ml-1 bg-[#2a2a2a] border border-[#444] rounded-lg shadow-xl py-1 min-w-[180px]"
          >
            <div className="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
              {pages.map((page) => (
                <div 
                  key={page.id}
                  onClick={() => handleSwitchPage(page.id)}
                  className={`
                    w-full text-left px-3 py-1.5 flex items-center justify-between group
                    ${activePageId === page.id ? 'bg-[#3a3a3a] text-blue-400' : 'text-gray-300 hover:bg-[#3a3a3a]'}
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
            
            <div className="h-px bg-[#444] my-1" />
            
            <button
              onClick={handleAddPage}
              className="w-full text-left px-3 py-1.5 text-gray-300 hover:bg-[#3a3a3a] flex items-center gap-2 text-sm transition-colors"
            >
              <Plus size={14} className="text-gray-400" />
              <span>New Page</span>
            </button>
          </div>
        )}
      </div>

      <div className="h-px bg-[#444] my-1" />

      {/* Group Actions */}
      {(showGroup || showUngroup) && (
        <>
          {showGroup && (
            <button
              onClick={handleGroup}
              className="w-full text-left px-3 py-1.5 text-gray-300 hover:bg-[#3a3a3a] flex items-center gap-2 text-sm transition-colors"
            >
              <Group size={14} />
              <span>Group Selection</span>
            </button>
          )}
          
          {showUngroup && (
            <button
              onClick={handleUngroup}
              className="w-full text-left px-3 py-1.5 text-gray-300 hover:bg-[#3a3a3a] flex items-center gap-2 text-sm transition-colors"
            >
              <Ungroup size={14} />
              <span>Ungroup</span>
            </button>
          )}
          <div className="h-px bg-[#444] my-1" />
        </>
      )}

      {/* Export */}
      <button
        className="w-full text-left px-3 py-1.5 text-gray-300 hover:bg-[#3a3a3a] flex items-center gap-2 text-sm transition-colors"
        onClick={handleExport}
      >
        <Download size={14} />
        <span>Export HTML</span>
      </button>

      <div className="h-px bg-[#444] my-1" />

      {/* Toggle Minimap */}
      <button
        className="w-full text-left px-3 py-1.5 text-gray-300 hover:bg-[#3a3a3a] flex items-center gap-2 text-sm transition-colors"
        onClick={handleToggleMinimap}
      >
        <MapIcon size={14} />
        <span>{isMinimapVisible ? 'Hide Minimap' : 'Show Minimap'}</span>
      </button>
    </div>
  );
};

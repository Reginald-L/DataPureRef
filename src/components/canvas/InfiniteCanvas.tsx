import React, { useRef, useEffect, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { GridBackground } from './GridBackground';
import { CanvasToolbar } from './CanvasToolbar';
import { screenToCanvas, canvasToScreen } from '../../utils/coordinates';
import { v4 as uuidv4 } from 'uuid';
import { CanvasObjectRenderer } from './CanvasObjectRenderer';
import { getFileType } from '../../utils/file';

import { ContextMenu } from './ContextMenu';
import { GroupToolbar } from './GroupToolbar';
import { CanvasObject } from '../../types/canvas';

const ObjectLayer = React.memo(({ objects }: { objects: CanvasObject[] }) => {
  return (
    <>
      {objects.map((obj) => (
        <CanvasObjectRenderer key={obj.id} object={obj} />
      ))}
    </>
  );
});

export const InfiniteCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { 
    viewport, 
    setViewport, 
    moveViewport, 
    addObject,
    addObjects,
    removeObject,
    selectedObjectIds,
    selectObjects,
    editingObjectId,
    objects,
    updateObjects,
    groupSelected,
    ungroupObject,
    undo,
    redo,
    loadCanvas
  } = useCanvasStore();

  // Selection Box State
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, current: { x: number, y: number } } | null>(null);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const visibleObjects = React.useMemo(() => {
    const buffer = 500; // Extra pixels around viewport
    const visibleLeft = -viewport.x / viewport.zoom - buffer;
    const visibleTop = -viewport.y / viewport.zoom - buffer;
    const visibleRight = (windowSize.width - viewport.x) / viewport.zoom + buffer;
    const visibleBottom = (windowSize.height - viewport.y) / viewport.zoom + buffer;

    return objects.filter(obj => {
      // Always show selected objects to avoid glitches
      if (selectedObjectIds.includes(obj.id)) return true;
      
      const objRight = obj.position.x + obj.size.width;
      const objBottom = obj.position.y + obj.size.height;

      return (
        objRight >= visibleLeft &&
        obj.position.x <= visibleRight &&
        objBottom >= visibleTop &&
        obj.position.y <= visibleBottom
      );
    });
  }, [objects, viewport, windowSize, selectedObjectIds]);

  // Handle Keyboard Shortcuts (Delete/Backspace, L for Arrange)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If we are editing text, don't delete the object on Backspace/Delete
      if (editingObjectId) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectIds.length > 0) {
          selectedObjectIds.forEach(id => removeObject(id));
        }
      }

      // Group / Ungroup Shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        if (e.shiftKey) {
          // Ungroup
          if (selectedObjectIds.length === 1) {
             ungroupObject(selectedObjectIds[0]);
          }
        } else {
          // Group
          if (selectedObjectIds.length > 1) {
            groupSelected();
          }
        }
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
            redo();
        } else {
            undo();
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
          e.preventDefault();
          redo();
      }

      // 'L' key to arrange selected objects horizontally
      if ((e.key === 'l' || e.key === 'L') && selectedObjectIds.length > 1) {
        // Filter out selected objects
        const selectedObjects = objects.filter(obj => selectedObjectIds.includes(obj.id));
        
        if (selectedObjects.length === 0) return;

        // Sort by name/content
        selectedObjects.sort((a, b) => {
          const getName = (obj: any) => {
             if (obj.type === 'text') return obj.content || '';
             if (obj.type === 'image') return obj.alt || '';
             if (obj.type === 'video') return obj.src || '';
             return '';
          };
          return getName(a).localeCompare(getName(b));
        });

        // Determine starting position (top-left of the bounding box of all selected items)
        const minX = Math.min(...selectedObjects.map(o => o.position.x));
        const minY = Math.min(...selectedObjects.map(o => o.position.y));

        // Arrange horizontally
        let currentX = minX;
        const gap = 20; // 20px gap
        
        const updates = selectedObjects.map(obj => {
          const update = {
            id: obj.id,
            changes: {
              position: { x: currentX, y: minY } // Top align
            }
          };
          currentX += obj.size.width + gap;
          return update;
        });

        updateObjects(updates);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectIds, editingObjectId, removeObject, objects, updateObjects, groupSelected, ungroupObject, undo, redo]);

  // Prevent default browser zoom and autoscroll (middle click)
  useEffect(() => {
    const preventDefaultZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    const preventDefaultAutoscroll = (e: MouseEvent) => {
      if (e.button === 1) { // Middle mouse button
        e.preventDefault();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', preventDefaultZoom, { passive: false });
      container.addEventListener('mousedown', preventDefaultAutoscroll, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener('wheel', preventDefaultZoom);
        container.removeEventListener('mousedown', preventDefaultAutoscroll);
      }
    };
  }, []);

  // Handle Paste
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      
      // If we are editing a text object (focused textarea), let default paste happen
      if (document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLInputElement) {
        return;
      }

      const items = e.clipboardData.items;
      // Center of screen in canvas coordinates:
      const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom;
      const centerY = (window.innerHeight / 2 - viewport.y) / viewport.zoom;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'string' && item.type === 'text/plain') {
          item.getAsString((text) => {
             addObject({
              id: uuidv4(),
              type: 'text',
              position: { x: centerX, y: centerY },
              size: { width: 300, height: 100 },
              zIndex: Date.now(),
              createdAt: Date.now(),
              updatedAt: Date.now(),
              content: text,
              fontSize: 16,
              fontWeight: 'normal',
              fontStyle: 'normal',
              color: '#ffffff'
            });
          });
        } else if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            await processFile(file, centerX, centerY);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [viewport, addObject]);

  const processFile = async (file: File, x: number, y: number) => {
    const fileType = getFileType(file);
    if (!fileType) return;

    try {
      const id = uuidv4();
      const zIndex = Date.now();
      
      if (fileType === 'text') {
        const text = await file.text();
        addObject({
          id,
          type: 'text',
          position: { x, y },
          size: { width: 420, height: 100 },
          zIndex,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          content: text,
          fontSize: 16,
          fontWeight: 'normal',
          fontStyle: 'normal',
          color: '#ffffff'
        });
        return;
      }

      // Use ObjectURL instead of DataURL to save memory
      const src = URL.createObjectURL(file);

      if (fileType === 'image') {
        // Load image to get dimensions
        const img = new Image();
        img.onload = () => {
           addObject({
            id,
            type: 'image',
            position: { x, y },
            size: { width: img.width, height: img.height }, // Maybe limit max size?
            zIndex,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            src,
            alt: file.name
          });
        };
        img.src = src;
      } else if (fileType === 'video') {
         addObject({
            id,
            type: 'video',
            position: { x, y },
            size: { width: 400, height: 300 }, // Default video size
            zIndex,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            src,
            currentTime: 0
          });
      }
    } catch (err) {
      console.error("Failed to process file", err);
    }
  };

  const getDroppedFiles = async (dataTransfer: DataTransfer): Promise<{ files: File[]; fromDirectory: boolean }> => {
    const items = Array.from(dataTransfer.items ?? []);
    if (items.length === 0) {
      return { files: Array.from(dataTransfer.files), fromDirectory: false };
    }

    const collectFromDirectoryHandle = async (dirHandle: any): Promise<File[]> => {
      const collected: File[] = [];
      for await (const handle of dirHandle.values()) {
        if (handle.kind === 'file') {
          collected.push(await handle.getFile());
        } else if (handle.kind === 'directory') {
          collected.push(...(await collectFromDirectoryHandle(handle)));
        }
      }
      return collected;
    };

    const collectFromDirectoryEntry = async (dirEntry: any): Promise<File[]> => {
      const reader = dirEntry.createReader();
      const entries: any[] = [];
      while (true) {
        const batch = await new Promise<any[]>((resolve) => {
          reader.readEntries(resolve, () => resolve([]));
        });
        if (batch.length === 0) break;
        entries.push(...batch);
      }

      const collected: File[] = [];
      for (const entry of entries) {
        if (entry.isFile) {
          const file = await new Promise<File | null>((resolve) => {
            entry.file((f: File) => resolve(f), () => resolve(null));
          });
          if (file) collected.push(file);
        } else if (entry.isDirectory) {
          collected.push(...(await collectFromDirectoryEntry(entry)));
        }
      }
      return collected;
    };

    const collected: File[] = [];
    let fromDirectory = false;

    for (const item of items) {
      const anyItem = item as any;

      if (typeof anyItem.getAsFileSystemHandle === 'function') {
        try {
          const handle = await anyItem.getAsFileSystemHandle();
          if (handle?.kind === 'directory') {
            fromDirectory = true;
            collected.push(...(await collectFromDirectoryHandle(handle)));
            continue;
          }
          if (handle?.kind === 'file') {
            collected.push(await handle.getFile());
            continue;
          }
        } catch {
        }
      }

      if (typeof anyItem.webkitGetAsEntry === 'function') {
        const entry = anyItem.webkitGetAsEntry();
        if (entry?.isDirectory) {
          fromDirectory = true;
          collected.push(...(await collectFromDirectoryEntry(entry)));
          continue;
        }
        if (entry?.isFile) {
          const file = await new Promise<File | null>((resolve) => {
            entry.file((f: File) => resolve(f), () => resolve(null));
          });
          if (file) collected.push(file);
          continue;
        }
      }

      const file = item.getAsFile();
      if (file) collected.push(file);
    }

    if (!fromDirectory) {
      return { files: Array.from(dataTransfer.files), fromDirectory: false };
    }

    return { files: collected, fromDirectory: true };
  };

  const importDirectoryMedia = async (files: File[], x: number, y: number) => {
    const getBaseName = (name: string) => name.replace(/\.[^/.]+$/, '').toLowerCase();
    const pairs = new Map<string, { video?: File; image?: File; text?: File }>();

    for (const file of files) {
      const type = getFileType(file);
      if (type !== 'video' && type !== 'image' && type !== 'text') continue;
      const key = getBaseName(file.name);
      const current = pairs.get(key) ?? {};
      if (type === 'video' && !current.video) current.video = file;
      if (type === 'image' && !current.image) current.image = file;
      if (type === 'text' && !current.text) current.text = file;
      pairs.set(key, current);
    }

    if (pairs.size === 0) return;

    const keys = Array.from(pairs.keys()).sort((a, b) => a.localeCompare(b));
    const baseTime = Date.now();
    const columnWidth = 420;
    const rowGap = 20;
    const videoSize = { width: 400, height: 300 };
    const imageSlotHeight = 300;
    const textSize = { width: 420, height: 120 };

    const objectsToAdd: CanvasObject[] = [];
    const BATCH_SIZE = 5; // Process in small batches to avoid OOM
    let isFirstBatch = true;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const pair = pairs.get(key);
      if (!pair) continue;

      const colX = x + i * columnWidth;

      try {
        if (pair.video) {
          // Use ObjectURL instead of DataURL to save memory
          const videoSrc = URL.createObjectURL(pair.video);
          objectsToAdd.push({
            id: uuidv4(),
            type: 'video',
            position: { x: colX, y },
            size: { ...videoSize },
            zIndex: baseTime + i * 3,
            createdAt: baseTime,
            updatedAt: baseTime,
            src: videoSrc,
            currentTime: 0
          });
        }

        if (pair.image) {
          // Use ObjectURL instead of DataURL to save memory
          const imageSrc = URL.createObjectURL(pair.image);
          const img = new Image();
          const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.src = imageSrc;
          });
          const maxW = videoSize.width;
          const maxH = videoSize.height;
          const scale = Math.min(maxW / width, maxH / height, 1);
          objectsToAdd.push({
            id: uuidv4(),
            type: 'image',
            position: { x: colX, y: y + videoSize.height + rowGap },
            size: { width: Math.round(width * scale), height: Math.round(height * scale) },
            zIndex: baseTime + i * 3 + 1,
            createdAt: baseTime,
            updatedAt: baseTime,
            src: imageSrc,
            alt: pair.image.name
          });
        }

        if (pair.text) {
          const text = await pair.text.text();
          objectsToAdd.push({
            id: uuidv4(),
            type: 'text',
            position: { x: colX, y: y + videoSize.height + rowGap + imageSlotHeight + rowGap },
            size: { ...textSize },
            zIndex: baseTime + i * 3 + 2,
            createdAt: baseTime,
            updatedAt: baseTime,
            content: text,
            fontSize: 16,
            fontWeight: 'normal',
            fontStyle: 'normal',
            color: '#ffffff'
          });
        }
      } catch (err) {
        console.error(`Failed to process file pair ${key}:`, err);
        continue;
      }

      // Dispatch batch if full or last item
      if (objectsToAdd.length >= BATCH_SIZE || i === keys.length - 1) {
        if (objectsToAdd.length > 0) {
          addObjects([...objectsToAdd], !isFirstBatch); // Only save history for the first batch
          isFirstBatch = false;
          objectsToAdd.length = 0; // Clear array
          // Give UI a chance to update and GC to run
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const { x, y } = screenToCanvas(mouseX, mouseY, viewport);

    setIsLoading(true);
    
    try {
        const dropped = await getDroppedFiles(e.dataTransfer);
        const files = dropped.files;
        if (files.length === 0) return;

        if (dropped.fromDirectory) {
          await importDirectoryMedia(files, x, y);
          return;
        }

        // Check for HTML export file first
        const htmlFile = files.find(f => f.type === 'text/html' || f.name.endsWith('.html'));
        if (htmlFile) {
            try {
                const text = await htmlFile.text();
                // Look for the state object in the exported HTML
                // Pattern: const state = {...}; followed by let { viewport } = state;
                // We include the following line in the regex to ensure we don't stop early at a "};" inside a string
                const match = text.match(/const state = ({[\s\S]*?});\s*let\s+\{\s*viewport\s*\}\s*=\s*state;/);
                
                if (match && match[1]) {
                    const state = JSON.parse(match[1]);
                    if (state.objects && state.viewport) {
                        loadCanvas(state);
                        return; // Stop processing other files
                    }
                }
            } catch (err) {
                console.error("Failed to parse HTML export", err);
            }
            
            alert('暂不支持非系统导出的文件');
            return;
        }

        let offset = 0;
        for (const file of files) {
          // Skip if we already processed it as HTML (though we returned above, so this is just for safety/clarity)
          if (file === htmlFile) continue;
          
          await processFile(file, x + offset, y + offset);
          offset += 20; // Cascade
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const panRafRef = useRef<number | null>(null);
  const panPendingRef = useRef({ dx: 0, dy: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Shift + Left Click -> Start Marquee Selection
    if (e.shiftKey && e.button === 0) {
      e.preventDefault();
      setSelectionBox({
        start: { x: clientX, y: clientY },
        current: { x: clientX, y: clientY }
      });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // Middle mouse button (button 1) -> Pan
    if (e.button === 1) {
      e.preventDefault();
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    // Left click on background -> Deselect all
    if (e.button === 0 && !e.shiftKey) {
       selectObjects([]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Update Selection Box
    if (selectionBox) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      
      setSelectionBox(prev => prev ? { ...prev, current: { x: clientX, y: clientY } } : null);
      return;
    }

    // Pan Canvas
    if (isDraggingRef.current) {
      e.preventDefault();
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      panPendingRef.current.dx += dx;
      panPendingRef.current.dy += dy;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      if (panRafRef.current == null) {
        panRafRef.current = requestAnimationFrame(() => {
          panRafRef.current = null;
          const { dx: pdx, dy: pdy } = panPendingRef.current;
          panPendingRef.current = { dx: 0, dy: 0 };
          if (pdx !== 0 || pdy !== 0) {
            moveViewport(pdx, pdy);
          }
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // Finalize Selection
    if (selectionBox) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        // Calculate selection bounds in screen space
        const minX = Math.min(selectionBox.start.x, selectionBox.current.x);
        const minY = Math.min(selectionBox.start.y, selectionBox.current.y);
        const maxX = Math.max(selectionBox.start.x, selectionBox.current.x);
        const maxY = Math.max(selectionBox.start.y, selectionBox.current.y);

        // Convert to canvas coordinates to compare with objects
        // But wait, screenToCanvas converts a single point.
        // The selection box is an AABB in screen space.
        // We need to check if object's AABB (in canvas space) converted to screen space intersects with selection box.
        
        const newSelectedIds: string[] = [];

        objects.forEach(obj => {
          // Object bounds in canvas space
          const objCanvasX = obj.position.x;
          const objCanvasY = obj.position.y;
          const objCanvasW = obj.size.width;
          const objCanvasH = obj.size.height;

          // Convert object position to screen space
          const screenPos = canvasToScreen(objCanvasX, objCanvasY, viewport);
          // Width/Height in screen space scales with zoom
          const screenW = objCanvasW * viewport.zoom;
          const screenH = objCanvasH * viewport.zoom;

          const objScreenMinX = screenPos.x;
          const objScreenMinY = screenPos.y;
          const objScreenMaxX = screenPos.x + screenW;
          const objScreenMaxY = screenPos.y + screenH;

          // Check Intersection
          const isIntersecting = 
            minX < objScreenMaxX &&
            maxX > objScreenMinX &&
            minY < objScreenMaxY &&
            maxY > objScreenMinY;

          if (isIntersecting) {
            newSelectedIds.push(obj.id);
          }
        });

        // If we are holding shift, maybe we want to ADD to selection?
        // The prompt says "Hold shift... to select multiple". Usually this implies a new selection set or adding.
        // Standard behavior for marquee: usually replaces selection unless Ctrl is held.
        // But since Shift is the trigger here, let's make it replace or add?
        // Let's make it REPLACE for now as it's a specific mode "Shift+Drag".
        // Or if the user meant "add to selection", we can merge.
        // Let's default to REPLACE for clarity, as Shift+Drag is often "Add" in some apps but "New Selection" in others.
        // Actually, in Windows Explorer, drag selects. Shift+Click selects range. Ctrl+Click toggles.
        // Since we require Shift to even START dragging, it's safer to just set the selection to whatever is in the box.
        selectObjects(newSelectedIds);
      }
      
      setSelectionBox(null);
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      return;
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (panRafRef.current != null) {
        cancelAnimationFrame(panRafRef.current);
        panRafRef.current = null;
      }
      const { dx: pdx, dy: pdy } = panPendingRef.current;
      panPendingRef.current = { dx: 0, dy: 0 };
      if (pdx !== 0 || pdy !== 0) {
        moveViewport(pdx, pdy);
      }
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  useGesture(
    {
      onWheel: ({ event, delta: [, dy] }) => {
        // Zoom on wheel
        event.preventDefault();
        
        const zoomFactor = -dy * 0.001;
        const scale = 1 + zoomFactor;
        const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * scale));
        
        // Calculate new viewport position to zoom towards mouse
        const rect = (event.target as Element).closest('.canvas-container')?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = (event as any).clientX - rect.left;
        const mouseY = (event as any).clientY - rect.top;

        // Current canvas coordinates of the mouse
        const canvasX = (mouseX - viewport.x) / viewport.zoom;
        const canvasY = (mouseY - viewport.y) / viewport.zoom;

        // New viewport position
        const newX = mouseX - canvasX * newZoom;
        const newY = mouseY - canvasY * newZoom;

        setViewport({
          zoom: newZoom,
          x: newX,
          y: newY
        });
      },
    },
    {
      target: containerRef,
      eventOptions: { passive: false },
      drag: { filterTaps: true }
    }
  );

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Only add text if clicking on the background (not on an object)
    if (e.target !== containerRef.current && e.target !== containerRef.current?.firstChild) {
      // Check if clicking on grid background (which is usually the first child or behind everything)
    }

    // A better check might be to see if the target has a specific class or if we are not clicking on an object
    // For now, if we click on an object, stopPropagation in CanvasObjectRenderer handles it.
    // So if we reach here, it's likely the background.

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const { x, y } = screenToCanvas(mouseX, mouseY, viewport);

    addObject({
      id: uuidv4(),
      type: 'text',
      position: { x, y },
      size: { width: 200, height: 50 }, // Default size
      zIndex: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      content: '', // Start empty
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#ffffff'
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      ref={containerRef}
      className="canvas-container relative w-full h-screen overflow-hidden bg-[#1a1a1a] select-none"
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <GridBackground viewport={viewport} />
      <CanvasToolbar />
      <GroupToolbar />
      
      {/* Object Layer */}
      <div 
        className="absolute top-0 left-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
        }}
      >
        <ObjectLayer objects={visibleObjects} />
      </div>

      {/* Selection Box */}
      {selectionBox && (
        <div 
          className="absolute border border-blue-500 bg-blue-500/20 pointer-events-none z-50"
          style={{
            left: Math.min(selectionBox.start.x, selectionBox.current.x),
            top: Math.min(selectionBox.start.y, selectionBox.current.y),
            width: Math.abs(selectionBox.current.x - selectionBox.start.x),
            height: Math.abs(selectionBox.current.y - selectionBox.start.y)
          }}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          onClose={() => setContextMenu(null)} 
        />
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="w-16 h-16 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

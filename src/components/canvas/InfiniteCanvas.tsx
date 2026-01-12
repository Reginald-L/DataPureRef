import React, { useRef, useEffect, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { GridBackground } from './GridBackground';
import { CanvasToolbar } from './CanvasToolbar';
import { screenToCanvas, canvasToScreen } from '../../utils/coordinates';
import { v4 as uuidv4 } from 'uuid';
import { CanvasObjectRenderer } from './CanvasObjectRenderer';
import { readFileAsDataURL, getFileType } from '../../utils/file';

export const InfiniteCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { 
    viewport, 
    setViewport, 
    moveViewport, 
    addObject,
    removeObject,
    selectedObjectIds,
    selectObjects,
    editingObjectId,
    objects,
    updateObjects
  } = useCanvasStore();

  // Selection Box State
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, current: { x: number, y: number } } | null>(null);

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
  }, [selectedObjectIds, editingObjectId, removeObject, objects, updateObjects]);

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
      const src = await readFileAsDataURL(file);
      const id = uuidv4();
      const zIndex = Date.now();
      
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const { x, y } = screenToCanvas(mouseX, mouseY, viewport);

    const files = Array.from(e.dataTransfer.files);
    let offset = 0;
    for (const file of files) {
      await processFile(file, x + offset, y + offset);
      offset += 20; // Cascade
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

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
      moveViewport(dx, dy);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
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
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  useGesture(
    {
      onWheel: ({ event, delta: [, dy], ctrlKey }) => {
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

  return (
    <div 
      ref={containerRef}
      className="canvas-container relative w-full h-screen overflow-hidden bg-[#1a1a1a] select-none"
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <GridBackground viewport={viewport} />
      <CanvasToolbar />
      
      {/* Object Layer */}
      <div 
        className="absolute top-0 left-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
        }}
      >
        {objects.map(obj => (
          <CanvasObjectRenderer key={obj.id} object={obj} />
        ))}
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
    </div>
  );
};

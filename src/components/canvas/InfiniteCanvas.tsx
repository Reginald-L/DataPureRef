import React, { useRef, useEffect } from 'react';
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
    selectedObjectId,
    editingObjectId,
    objects
  } = useCanvasStore();

  // Handle Keyboard Shortcuts (Delete/Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If we are editing text, don't delete the object on Backspace/Delete
      if (editingObjectId) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId) {
          removeObject(selectedObjectId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectId, editingObjectId, removeObject]);

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
    // Middle mouse button (button 1)
    if (e.button === 1) {
      e.preventDefault();
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      moveViewport(dx, dy);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
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
    </div>
  );
};

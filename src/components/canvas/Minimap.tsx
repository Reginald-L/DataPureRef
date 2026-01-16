import React, { useEffect, useRef } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { X } from 'lucide-react';

const MINIMAP_WIDTH = 300;
const MINIMAP_HEIGHT = 200;
const PADDING = 10;
const MIN_OBJECT_SIZE = 6;
const MIN_VIEWPORT_SIZE = 20;

export const Minimap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { objects, viewport, zoomCanvas, setViewport, isMinimapVisible, toggleMinimap } = useCanvasStore();
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Helper to get transformation parameters
  const getTransformParams = () => {
    // 1. Calculate World Bounds (Objects Only)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    if (objects.length === 0) {
      minX = -500; maxX = 500;
      minY = -500; maxY = 500;
    } else {
      objects.forEach(obj => {
        if (obj.position.x < minX) minX = obj.position.x;
        if (obj.position.y < minY) minY = obj.position.y;
        if (obj.position.x + obj.size.width > maxX) maxX = obj.position.x + obj.size.width;
        if (obj.position.y + obj.size.height > maxY) maxY = obj.position.y + obj.size.height;
      });
    }

    // Viewport in World Space
    const vx = -viewport.x / viewport.zoom;
    const vy = -viewport.y / viewport.zoom;
    const vw = window.innerWidth / viewport.zoom;
    const vh = window.innerHeight / viewport.zoom;

    // Do NOT expand bounds to include viewport. 
    // This ensures objects are always maximized in the minimap.

    // Add padding
    const worldW = maxX - minX + PADDING * 2;
    const worldH = maxY - minY + PADDING * 2;
    const originX = minX - PADDING;
    const originY = minY - PADDING;

    // Calculate Scale
    const scaleX = MINIMAP_WIDTH / worldW;
    const scaleY = MINIMAP_HEIGHT / worldH;
    const scale = Math.min(scaleX, scaleY);

    // Centering offsets
    const offsetX = (MINIMAP_WIDTH - worldW * scale) / 2;
    const offsetY = (MINIMAP_HEIGHT - worldH * scale) / 2;

    return { originX, originY, scale, offsetX, offsetY, vx, vy, vw, vh };
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { originX, originY, scale, offsetX, offsetY, vx, vy, vw, vh } = getTransformParams();

    const toMinimap = (x: number, y: number) => ({
      x: (x - originX) * scale + offsetX,
      y: (y - originY) * scale + offsetY
    });

    // 2. Draw Objects
    ctx.fillStyle = '#60a5fa'; // Blue-400 (Brighter)
    objects.forEach(obj => {
      const pos = toMinimap(obj.position.x, obj.position.y);
      const realW = obj.size.width * scale;
      const realH = obj.size.height * scale;
      
      // Ensure objects are at least visible (MIN_OBJECT_SIZE)
      // Center the enlarged object representation
      const w = Math.max(MIN_OBJECT_SIZE, realW);
      const h = Math.max(MIN_OBJECT_SIZE, realH);
      
      const x = pos.x - (w - realW) / 2;
      const y = pos.y - (h - realH) / 2;
      
      ctx.fillRect(x, y, w, h);
    });

    // 3. Draw Viewport Rect
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3; // Thicker border
    const vPos = toMinimap(vx, vy);
    const realVW = vw * scale;
    const realVH = vh * scale;
    
    // Ensure viewport is at least visible (MIN_VIEWPORT_SIZE)
    // Center the enlarged viewport representation
    const drawVW = Math.max(MIN_VIEWPORT_SIZE, realVW);
    const drawVH = Math.max(MIN_VIEWPORT_SIZE, realVH);
    
    const drawVX = vPos.x - (drawVW - realVW) / 2;
    const drawVY = vPos.y - (drawVH - realVH) / 2;
    
    ctx.strokeRect(drawVX, drawVY, drawVW, drawVH);
    
    // Fill viewport slightly
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // More visible fill
    ctx.fillRect(drawVX, drawVY, drawVW, drawVH);
  };

  useEffect(() => {
    let animationFrameId: number;
    const renderLoop = () => {
      draw();
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [objects, viewport]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { originX, originY, scale, offsetX, offsetY, vx, vy, vw, vh } = getTransformParams();
    
    const toMinimap = (x: number, y: number) => ({
      x: (x - originX) * scale + offsetX,
      y: (y - originY) * scale + offsetY
    });

    const vPos = toMinimap(vx, vy);
    const realVW = vw * scale;
    const realVH = vh * scale;

    const drawVW = Math.max(MIN_VIEWPORT_SIZE, realVW);
    const drawVH = Math.max(MIN_VIEWPORT_SIZE, realVH);
    const drawVX = vPos.x - (drawVW - realVW) / 2;
    const drawVY = vPos.y - (drawVH - realVH) / 2;

    // Check if clicked inside viewport rect (using the enlarged visual rect)
    if (mx >= drawVX && mx <= drawVX + drawVW && my >= drawVY && my <= drawVY + drawVH) {
        isDragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        
        // Calculate drag offset relative to the ACTUAL center of the viewport
        const vCenterX = vPos.x + realVW / 2;
        const vCenterY = vPos.y + realVH / 2;
        
        dragOffset.current = {
            x: vCenterX - mx,
            y: vCenterY - my
        };
    } else {
        // Clicked outside: Jump to position
        // New center is mouse position
        const worldX = (mx - offsetX) / scale + originX;
        const worldY = (my - offsetY) / scale + originY;
        
        const newViewportX = -worldX * viewport.zoom + window.innerWidth / 2;
        const newViewportY = -worldY * viewport.zoom + window.innerHeight / 2;
        
        setViewport({ x: newViewportX, y: newViewportY });
        
        isDragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        
        // Offset is 0 because we just centered on mouse
        dragOffset.current = { x: 0, y: 0 };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const { originX, originY, scale, offsetX, offsetY } = getTransformParams();

    // Target Center in Minimap Space
    const targetCenterX = mx + dragOffset.current.x;
    const targetCenterY = my + dragOffset.current.y;

    // Calculate world position for this center
    const worldX = (targetCenterX - offsetX) / scale + originX;
    const worldY = (targetCenterY - offsetY) / scale + originY;

    // Center viewport on this point
    const newViewportX = -worldX * viewport.zoom + window.innerWidth / 2;
    const newViewportY = -worldY * viewport.zoom + window.innerHeight / 2;
    
    setViewport({ x: newViewportX, y: newViewportY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Standardize wheel delta
    const delta = -e.deltaY;
    const factor = Math.pow(1.001, delta);
    zoomCanvas(factor);
  };

  if (!isMinimapVisible) return null;

  return (
    <div 
      className="absolute bottom-6 right-6 z-50 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl overflow-hidden group"
      style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <button
        className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 z-10"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          toggleMinimap();
        }}
        title="Hide Minimap"
      >
        <X size={14} />
      </button>

      <canvas 
        ref={canvasRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        className="w-full h-full block cursor-crosshair touch-none"
      />
    </div>
  );
};

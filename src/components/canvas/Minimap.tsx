import React, { useEffect, useRef } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { X } from 'lucide-react';

const MINIMAP_WIDTH = 240;
const MINIMAP_HEIGHT = 160;
const PADDING = 40;

export const Minimap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { objects, viewport, zoomCanvas, setViewport, isMinimapVisible, toggleMinimap } = useCanvasStore();
  const isDragging = useRef(false);

  // Helper to get transformation parameters
  const getTransformParams = () => {
    // 1. Calculate World Bounds (Objects + Viewport)
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

    // Expand bounds to include viewport
    minX = Math.min(minX, vx);
    minY = Math.min(minY, vy);
    maxX = Math.max(maxX, vx + vw);
    maxY = Math.max(maxY, vh);

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
    ctx.fillStyle = '#3b82f6'; // Blue-500
    objects.forEach(obj => {
      const pos = toMinimap(obj.position.x, obj.position.y);
      ctx.fillRect(
        pos.x, 
        pos.y, 
        obj.size.width * scale, 
        obj.size.height * scale
      );
    });

    // 3. Draw Viewport Rect
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    const vPos = toMinimap(vx, vy);
    ctx.strokeRect(
      vPos.x,
      vPos.y,
      vw * scale,
      vh * scale
    );
    
    // Fill viewport slightly
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(
      vPos.x,
      vPos.y,
      vw * scale,
      vh * scale
    );
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
    const vWidth = vw * scale;
    const vHeight = vh * scale;

    // Check if clicked inside viewport rect
    if (mx >= vPos.x && mx <= vPos.x + vWidth && my >= vPos.y && my <= vPos.y + vHeight) {
        isDragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } else {
        // Clicked outside: Jump to position
        // Calculate new center in world space
        // Inverse of toMinimap:
        // x_mm = (x_world - originX) * scale + offsetX
        // x_world = (x_mm - offsetX) / scale + originX
        
        const worldX = (mx - offsetX) / scale + originX;
        const worldY = (my - offsetY) / scale + originY;
        
        // Center viewport on this point
        // New viewport x (transform) = -(worldX - windowWidth/2/zoom) * zoom
        // = -worldX * zoom + windowWidth/2
        
        const newViewportX = -worldX * viewport.zoom + window.innerWidth / 2;
        const newViewportY = -worldY * viewport.zoom + window.innerHeight / 2;
        
        setViewport({ x: newViewportX, y: newViewportY });
        
        // Also start dragging immediately for smoothness
        isDragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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

    // Calculate world position under mouse (this should be the new center)
    const worldX = (mx - offsetX) / scale + originX;
    const worldY = (my - offsetY) / scale + originY;

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

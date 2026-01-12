import { Viewport } from '../types/canvas';

export const screenToCanvas = (screenX: number, screenY: number, viewport: Viewport) => {
  return {
    x: (screenX - viewport.x) / viewport.zoom,
    y: (screenY - viewport.y) / viewport.zoom
  };
};

export const canvasToScreen = (canvasX: number, canvasY: number, viewport: Viewport) => {
  return {
    x: canvasX * viewport.zoom + viewport.x,
    y: canvasY * viewport.zoom + viewport.y
  };
};

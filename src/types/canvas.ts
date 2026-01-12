export interface CanvasObject {
  id: string;
  type: 'image' | 'video' | 'text';
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface ImageObject extends CanvasObject {
  type: 'image';
  src: string;
  alt?: string;
}

export interface VideoObject extends CanvasObject {
  type: 'video';
  src: string;
  thumbnail?: string;
  currentTime?: number;
}

export interface TextObject extends CanvasObject {
  type: 'text';
  content: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

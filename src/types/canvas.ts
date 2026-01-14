export interface BaseCanvasObject {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface ImageObject extends BaseCanvasObject {
  type: 'image';
  src: string;
  alt?: string;
}

export interface VideoObject extends BaseCanvasObject {
  type: 'video';
  src: string;
  thumbnail?: string;
  currentTime?: number;
}

export interface TextObject extends BaseCanvasObject {
  type: 'text';
  content: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
}

export interface GroupObject extends BaseCanvasObject {
  type: 'group';
  children: CanvasObject[];
}

export type CanvasObject = ImageObject | VideoObject | TextObject | GroupObject;

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasPage {
  id: string;
  name: string;
  objects: CanvasObject[];
  viewport: Viewport;
  updatedAt: number;
}

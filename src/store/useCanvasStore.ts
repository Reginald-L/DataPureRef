import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CanvasObject, Viewport } from '../types/canvas';
import { openDB } from 'idb';

interface CanvasStore {
  objects: CanvasObject[];
  viewport: Viewport;
  selectedObjectId: string | null;
  editingObjectId: string | null;
  
  setViewport: (viewport: Partial<Viewport>) => void;
  moveViewport: (deltaX: number, deltaY: number) => void;
  zoomCanvas: (scale: number, center?: { x: number; y: number }) => void;
  
  addObject: (object: CanvasObject) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  setEditingObjectId: (id: string | null) => void;
  loadCanvas: (state: { objects: CanvasObject[]; viewport: Viewport }) => void;
  
  updateObjects: (updates: { id: string; changes: Partial<CanvasObject> }[]) => void;
}

// Debounce helper
const debounce = (fn: Function, ms: number) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

// Custom storage using IndexedDB for handling large base64 strings
const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const db = await openDB('canvas-db', 1, {
      upgrade(db) {
        db.createObjectStore('store');
      },
    });
    return (await db.get('store', name)) || null;
  },
  setItem: debounce(async (name: string, value: string): Promise<void> => {
    const db = await openDB('canvas-db', 1, {
      upgrade(db) {
        db.createObjectStore('store');
      },
    });
    await db.put('store', value, name);
  }, 1000), // Debounce writes by 1 second
  removeItem: async (name: string): Promise<void> => {
    const db = await openDB('canvas-db', 1, {
      upgrade(db) {
        db.createObjectStore('store');
      },
    });
    await db.delete('store', name);
  },
};

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      objects: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedObjectId: null,
      editingObjectId: null,

      setViewport: (viewport) => 
        set((state) => ({
          viewport: { ...state.viewport, ...viewport }
        })),

      moveViewport: (dx, dy) =>
        set((state) => ({
          viewport: {
            ...state.viewport,
            x: state.viewport.x + dx,
            y: state.viewport.y + dy,
          }
        })),

      zoomCanvas: (scale, center) =>
        set((state) => {
          const newZoom = Math.max(0.1, Math.min(5, state.viewport.zoom * scale));
          return {
            viewport: {
              ...state.viewport,
              zoom: newZoom
            }
          };
        }),

      addObject: (object) =>
        set((state) => ({
          objects: [...state.objects, object],
          selectedObjectId: object.id // Select new object
        })),

      updateObject: (id, updates) =>
        set((state) => ({
          objects: state.objects.map((obj) =>
            obj.id === id ? { ...obj, ...updates, updatedAt: Date.now() } as CanvasObject : obj
          )
        })),

      removeObject: (id) =>
        set((state) => ({
          objects: state.objects.filter((obj) => obj.id !== id),
          selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId
        })),

      selectObject: (id) =>
        set(() => ({
          selectedObjectId: id
        })),

      setEditingObjectId: (id) =>
        set(() => ({
          editingObjectId: id
        })),

      loadCanvas: (loadedState) =>
        set(() => ({
          objects: loadedState.objects,
          viewport: loadedState.viewport
        })),

      updateObjects: (updates) =>
        set((state) => {
          const updateMap = new Map(updates.map(u => [u.id, u.changes]));
          return {
            objects: state.objects.map(obj => {
              const changes = updateMap.get(obj.id);
              if (changes) {
                return { ...obj, ...changes, updatedAt: Date.now() } as CanvasObject;
              }
              return obj;
            })
          };
        })
    }),
    {
      name: 'canvas-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ objects: state.objects, viewport: state.viewport }), // Only persist data
    }
  )
);

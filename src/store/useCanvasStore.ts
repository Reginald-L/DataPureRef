import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CanvasObject, Viewport, GroupObject, CanvasPage } from '../types/canvas';
import { openDB } from 'idb';
import { v4 as uuidv4 } from 'uuid';

interface CanvasStore {
  pages: CanvasPage[];
  activePageId: string;
  objects: CanvasObject[]; // Kept at root for active page convenience
  viewport: Viewport;      // Kept at root for active page convenience
  selectedObjectIds: string[]; 
  editingObjectId: string | null;
  
  history: {
    past: CanvasObject[][];
    future: CanvasObject[][];
  };

  pushHistorySnapshot: () => void;
  undo: () => void;
  redo: () => void;
  
  // Page Management
  addPage: () => void;
  switchPage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;

  setViewport: (viewport: Partial<Viewport>) => void;
  moveViewport: (deltaX: number, deltaY: number) => void;
  zoomCanvas: (scale: number) => void;
  
  addObject: (object: CanvasObject, skipHistory?: boolean) => void;
  addObjects: (objects: CanvasObject[], skipHistory?: boolean) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  updateObjectTransient: (id: string, updates: Partial<CanvasObject>) => void;
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  selectObjects: (ids: string[]) => void;
  toggleObjectSelection: (id: string) => void;
  setEditingObjectId: (id: string | null) => void;
  loadCanvas: (state: { objects: CanvasObject[]; viewport: Viewport }) => void;
  
  updateObjects: (updates: { id: string; changes: Partial<CanvasObject> }[]) => void;
  updateObjectsTransient: (updates: { id: string; changes: Partial<CanvasObject> }[]) => void;
  moveObjectsByDelta: (ids: string[], dx: number, dy: number) => void;
  
  groupSelected: () => void;
  ungroupObject: (id: string) => void;
  alignGroupChildren: (groupId: string, alignment: 'left' | 'center' | 'right') => void;
}

const dbPromise = openDB('canvas-db', 1, {
  upgrade(db) {
    db.createObjectStore('store');
  },
});

const persistStorage = (() => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastName: string | null = null;
  let lastValue: any = null;

  const flush = async () => {
    if (!lastName) return;
    const db = await dbPromise;
    await db.put('store', JSON.stringify(lastValue), lastName);
  };

  return {
    getItem: async (name: string): Promise<any | null> => {
      const db = await dbPromise;
      const raw = (await db.get('store', name)) || null;
      return raw ? JSON.parse(raw) : null;
    },
    setItem: (name: string, value: any): void => {
      lastName = name;
      lastValue = value;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        flush();
      }, 1000);
    },
    removeItem: async (name: string): Promise<void> => {
      const db = await dbPromise;
      await db.delete('store', name);
    },
  };
})();

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set) => ({
      pages: [],
      activePageId: 'default',
      objects: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedObjectIds: [],
      editingObjectId: null,
      history: { past: [], future: [] },

      pushHistorySnapshot: () =>
        set((state) => ({
          history: {
            past: [...state.history.past, state.objects].slice(-50),
            future: [],
          },
        })),

      undo: () => set((state) => {
        const { past, future } = state.history;
        if (past.length === 0) return {};

        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        const newFuture = [state.objects, ...future];

        const newPages = state.pages.map(p => 
            p.id === state.activePageId 
            ? { ...p, objects: previous, updatedAt: Date.now() } 
            : p
        );

        return {
            objects: previous,
            history: {
                past: newPast,
                future: newFuture
            },
            pages: newPages,
            selectedObjectIds: [] 
        };
      }),

      redo: () => set((state) => {
        const { past, future } = state.history;
        if (future.length === 0) return {};

        const next = future[0];
        const newFuture = future.slice(1);
        const newPast = [...past, state.objects];

        const newPages = state.pages.map(p => 
            p.id === state.activePageId 
            ? { ...p, objects: next, updatedAt: Date.now() } 
            : p
        );

        return {
            objects: next,
            history: {
                past: newPast,
                future: newFuture
            },
            pages: newPages,
            selectedObjectIds: []
        };
      }),

      addPage: () => set((state) => {
        const newPageId = uuidv4();
        const newPage: CanvasPage = {
          id: newPageId,
          name: `Page ${state.pages.length + 1}`,
          objects: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          updatedAt: Date.now()
        };

        // If this is the first page (or pages was empty), active is new one.
        // If we are adding a new page, we should probably switch to it?
        // Let's switch to it.

        // First, ensure we sync current active page state back to pages array
        const updatedPages = state.pages.map(p => 
            p.id === state.activePageId 
            ? { ...p, objects: state.objects, viewport: state.viewport, updatedAt: Date.now() } 
            : p
        );

        return {
          pages: [...updatedPages, newPage],
          activePageId: newPageId,
          objects: newPage.objects,
          viewport: newPage.viewport,
          selectedObjectIds: [],
          editingObjectId: null,
          history: { past: [], future: [] }
        };
      }),

      switchPage: (pageId) => set((state) => {
        if (state.activePageId === pageId) return {};

        // Sync current active page
        const updatedPages = state.pages.map(p => 
            p.id === state.activePageId 
            ? { ...p, objects: state.objects, viewport: state.viewport, updatedAt: Date.now() } 
            : p
        );

        const targetPage = updatedPages.find(p => p.id === pageId);
        if (!targetPage) return {}; // Should not happen

        return {
          pages: updatedPages,
          activePageId: pageId,
          objects: targetPage.objects,
          viewport: targetPage.viewport,
          selectedObjectIds: [],
          editingObjectId: null,
          history: { past: [], future: [] }
        };
      }),

      deletePage: (pageId) => set((state) => {
        if (state.pages.length <= 1) return {}; // Prevent deleting last page

        const newPages = state.pages.filter(p => p.id !== pageId);
        
        // If we deleted the active page, switch to another
        if (state.activePageId === pageId) {
            const newActive = newPages[0];
            return {
                pages: newPages,
                activePageId: newActive.id,
                objects: newActive.objects,
                viewport: newActive.viewport,
                selectedObjectIds: [],
                editingObjectId: null,
                history: { past: [], future: [] }
            };
        }

        return { pages: newPages };
      }),

      renamePage: (pageId, name) => set((state) => ({
        pages: state.pages.map(p => p.id === pageId ? { ...p, name, updatedAt: Date.now() } : p)
      })),

      setViewport: (viewport) => 
        set((state) => {
            const newViewport = { ...state.viewport, ...viewport };
            // Sync to pages
            const newPages = state.pages.map(p => 
                p.id === state.activePageId 
                ? { ...p, viewport: newViewport, updatedAt: Date.now() } 
                : p
            );
            return {
                viewport: newViewport,
                pages: newPages
            };
        }),

      moveViewport: (dx, dy) =>
        set((state) => {
            const newViewport = {
                ...state.viewport,
                x: state.viewport.x + dx,
                y: state.viewport.y + dy,
            };
            const newPages = state.pages.map(p => 
                p.id === state.activePageId 
                ? { ...p, viewport: newViewport, updatedAt: Date.now() } 
                : p
            );
            return {
                viewport: newViewport,
                pages: newPages
            };
        }),

      zoomCanvas: (scale) =>
        set((state) => {
          const newZoom = Math.max(0.1, Math.min(5, state.viewport.zoom * scale));
          const newViewport = {
              ...state.viewport,
              zoom: newZoom
          };
          const newPages = state.pages.map(p => 
            p.id === state.activePageId 
            ? { ...p, viewport: newViewport, updatedAt: Date.now() } 
            : p
          );
          return {
            viewport: newViewport,
            pages: newPages
          };
        }),

      addObject: (object, skipHistory = false) =>
        set((state) => {
            const newObjects = [...state.objects, object];
            const newPages = state.pages.map(p => 
                p.id === state.activePageId 
                ? { ...p, objects: newObjects, updatedAt: Date.now() } 
                : p
            );
            return {
                objects: newObjects,
                selectedObjectIds: [object.id], // Select new object,
                pages: newPages,
                history: skipHistory ? state.history : {
                    past: [...state.history.past, state.objects].slice(-50),
                    future: []
                }
            };
        }),

      addObjects: (objectsToAdd, skipHistory = false) =>
        set((state) => {
          if (objectsToAdd.length === 0) return {};
          const newObjects = [...state.objects, ...objectsToAdd];
          const newPages = state.pages.map((p) =>
            p.id === state.activePageId ? { ...p, objects: newObjects, updatedAt: Date.now() } : p
          );
          return {
            objects: newObjects,
            selectedObjectIds: [],
            pages: newPages,
            history: skipHistory ? state.history : {
              past: [...state.history.past, state.objects].slice(-50),
              future: [],
            },
          };
        }),

      updateObject: (id, updates) =>
        set((state) => {
            const newObjects = state.objects.map((obj) =>
                obj.id === id ? { ...obj, ...updates, updatedAt: Date.now() } as CanvasObject : obj
            );
            const newPages = state.pages.map(p => 
                p.id === state.activePageId 
                ? { ...p, objects: newObjects, updatedAt: Date.now() } 
                : p
            );
            return {
                objects: newObjects,
                pages: newPages,
                history: {
                    past: [...state.history.past, state.objects].slice(-50),
                    future: []
                }
            };
        }),

      updateObjectTransient: (id, updates) =>
        set((state) => {
          const newObjects = state.objects.map((obj) =>
            obj.id === id ? ({ ...obj, ...updates, updatedAt: Date.now() } as CanvasObject) : obj
          );
          const newPages = state.pages.map((p) =>
            p.id === state.activePageId ? { ...p, objects: newObjects, updatedAt: Date.now() } : p
          );
          return {
            objects: newObjects,
            pages: newPages,
          };
        }),

      removeObject: (id) =>
        set((state) => {
            const newObjects = state.objects.filter((obj) => obj.id !== id);
            const newPages = state.pages.map(p => 
                p.id === state.activePageId 
                ? { ...p, objects: newObjects, updatedAt: Date.now() } 
                : p
            );
            return {
                objects: newObjects,
                selectedObjectIds: state.selectedObjectIds.filter(selectedId => selectedId !== id),
                pages: newPages,
                history: {
                    past: [...state.history.past, state.objects].slice(-50),
                    future: []
                }
            };
        }),

      selectObject: (id) =>
        set(() => ({
          selectedObjectIds: id ? [id] : []
        })),

      selectObjects: (ids) =>
        set(() => ({
          selectedObjectIds: ids
        })),

      toggleObjectSelection: (id) =>
        set((state) => {
          const isSelected = state.selectedObjectIds.includes(id);
          return {
            selectedObjectIds: isSelected
              ? state.selectedObjectIds.filter(selectedId => selectedId !== id)
              : [...state.selectedObjectIds, id]
          };
        }),

      setEditingObjectId: (id) =>
        set(() => ({
          editingObjectId: id
        })),

      loadCanvas: (loadedState) =>
        set((state) => {
            // Sync current active page state back to pages array
            const updatedPages = state.pages.map(p => 
                p.id === state.activePageId 
                ? { ...p, objects: state.objects, viewport: state.viewport, updatedAt: Date.now() } 
                : p
            );

            // Create new page from loadedState
            const newPageId = uuidv4();
            const newPage: CanvasPage = {
                id: newPageId,
                name: `Imported Page ${state.pages.length + 1}`,
                objects: loadedState.objects,
                viewport: loadedState.viewport,
                updatedAt: Date.now()
            };

            return {
                pages: [...updatedPages, newPage],
                activePageId: newPageId,
                objects: newPage.objects,
                viewport: newPage.viewport,
                selectedObjectIds: [],
                editingObjectId: null,
                history: { past: [], future: [] }
            };
        }),

      updateObjects: (updates) =>
        set((state) => {
          const updateMap = new Map(updates.map(u => [u.id, u.changes]));
          const newObjects = state.objects.map(obj => {
              const changes = updateMap.get(obj.id);
              if (changes) {
                return { ...obj, ...changes, updatedAt: Date.now() } as CanvasObject;
              }
              return obj;
            });
            
          const newPages = state.pages.map(p => 
            p.id === state.activePageId 
            ? { ...p, objects: newObjects, updatedAt: Date.now() } 
            : p
          );

          return {
            objects: newObjects,
            pages: newPages,
            history: {
                past: [...state.history.past, state.objects].slice(-50),
                future: []
            }
          };
        }),

      updateObjectsTransient: (updates) =>
        set((state) => {
          const updateMap = new Map(updates.map((u) => [u.id, u.changes]));
          const newObjects = state.objects.map((obj) => {
            const changes = updateMap.get(obj.id);
            if (!changes) return obj;
            return { ...obj, ...changes, updatedAt: Date.now() } as CanvasObject;
          });

          const newPages = state.pages.map((p) =>
            p.id === state.activePageId ? { ...p, objects: newObjects, updatedAt: Date.now() } : p
          );

          return {
            objects: newObjects,
            pages: newPages,
          };
        }),

      moveObjectsByDelta: (ids, dx, dy) =>
        set((state) => {
          if (ids.length === 0) return {};
          const idSet = new Set(ids);
          const newObjects = state.objects.map((obj) => {
            if (!idSet.has(obj.id)) return obj;
            return {
              ...obj,
              position: { x: obj.position.x + dx, y: obj.position.y + dy },
              updatedAt: Date.now(),
            } as CanvasObject;
          });

          const newPages = state.pages.map((p) =>
            p.id === state.activePageId ? { ...p, objects: newObjects, updatedAt: Date.now() } : p
          );

          return {
            objects: newObjects,
            pages: newPages,
          };
        }),

      groupSelected: () =>
        set((state) => {
          const selectedIds = state.selectedObjectIds;
          if (selectedIds.length < 2) return {};

          const selectedObjects = state.objects.filter((obj) => selectedIds.includes(obj.id));
          const remainingObjects = state.objects.filter((obj) => !selectedIds.includes(obj.id));

          if (selectedObjects.length === 0) return {};

          // Calculate bounds
          const minX = Math.min(...selectedObjects.map((o) => o.position.x));
          const minY = Math.min(...selectedObjects.map((o) => o.position.y));
          const maxX = Math.max(...selectedObjects.map((o) => o.position.x + o.size.width));
          const maxY = Math.max(...selectedObjects.map((o) => o.position.y + o.size.height));

          const groupWidth = maxX - minX;
          const groupHeight = maxY - minY;

          // Create children with relative positions
          const children = selectedObjects.map((obj) => ({
            ...obj,
            position: {
              x: obj.position.x - minX,
              y: obj.position.y - minY,
            },
          }));

          const groupObject: GroupObject = {
            id: uuidv4(),
            type: 'group',
            position: { x: minX, y: minY },
            size: { width: groupWidth, height: groupHeight },
            children: children,
            zIndex: Math.max(...selectedObjects.map((o) => o.zIndex)) + 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          const newObjects = [...remainingObjects, groupObject];
          const newPages = state.pages.map(p => 
            p.id === state.activePageId 
            ? { ...p, objects: newObjects, updatedAt: Date.now() } 
            : p
          );

          return {
            objects: newObjects,
            selectedObjectIds: [groupObject.id],
            pages: newPages,
            history: {
                past: [...state.history.past, state.objects].slice(-50),
                future: []
            }
          };
        }),

      ungroupObject: (id) =>
        set((state) => {
          const group = state.objects.find((obj) => obj.id === id) as GroupObject | undefined;
          if (!group || group.type !== 'group') return {};

          const remainingObjects = state.objects.filter((obj) => obj.id !== id);

          // Restore children to absolute positions
          const children = group.children.map((child) => ({
            ...child,
            position: {
              x: group.position.x + child.position.x,
              y: group.position.y + child.position.y,
            },
            zIndex: group.zIndex,
          }));

          const newObjects = [...remainingObjects, ...children];
          const newPages = state.pages.map(p => 
            p.id === state.activePageId 
            ? { ...p, objects: newObjects, updatedAt: Date.now() } 
            : p
          );

          return {
            objects: newObjects,
            selectedObjectIds: children.map((c) => c.id),
            pages: newPages,
            history: {
                past: [...state.history.past, state.objects].slice(-50),
                future: []
            }
          };
        }),

      alignGroupChildren: (groupId, alignment) =>
        set((state) => {
          const objects = state.objects.map((obj) => {
            if (obj.id !== groupId || obj.type !== 'group') return obj;

            const group = obj as GroupObject;
            const newChildren = group.children.map((child) => {
              let newX = child.position.x;
              if (alignment === 'left') {
                newX = 0;              } else if (alignment === 'center') {
                newX = (group.size.width - child.size.width) / 2;
              } else if (alignment === 'right') {
                newX = group.size.width - child.size.width;
              }
              return {
                ...child,
                position: { ...child.position, x: newX },
              };
            });

            return { ...group, children: newChildren, updatedAt: Date.now() };
          });

          const newPages = state.pages.map(p => 
            p.id === state.activePageId 
            ? { ...p, objects: objects, updatedAt: Date.now() } 
            : p
          );

          return { 
              objects, 
              pages: newPages,
              history: {
                  past: [...state.history.past, state.objects].slice(-50),
                  future: []
              }
          };
        })
    }),
    {
      name: 'canvas-storage',
      storage: persistStorage as any,
      partialize: (state) => ({ 
        objects: state.objects, 
        viewport: state.viewport,
        pages: state.pages,
        activePageId: state.activePageId
      }),
      onRehydrateStorage: () => (state) => {
        // Migration: If we have objects but no pages (legacy data), init pages
        if (state && (!state.pages || state.pages.length === 0)) {
            const defaultId = uuidv4();
            state.pages = [{
                id: defaultId,
                name: 'Page 1',
                objects: state.objects || [],
                viewport: state.viewport || { x: 0, y: 0, zoom: 1 },
                updatedAt: Date.now()
            }];
            state.activePageId = defaultId;
        }
      }
    }
  )
);

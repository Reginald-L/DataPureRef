import React from 'react';
import { useGesture } from '@use-gesture/react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { CanvasObject, ImageObject } from '../../types/canvas';
import { ImageRenderer } from './renderers/ImageRenderer';
import { VideoRenderer } from './renderers/VideoRenderer';
import { TextRenderer } from './renderers/TextRenderer';
import { GroupRenderer } from './GroupRenderer';
import { cn } from '../../lib/utils';

interface ResizeHandleProps {
  cursor: string;
  onResize: (delta: [number, number]) => void;
  className?: string;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ cursor, onResize, className }) => {
  const bind = useGesture({
    onDrag: ({ delta, event }) => {
      event.stopPropagation();
      onResize(delta);
    },
  }, {
    drag: {
      filterTaps: true,
      eventOptions: { passive: false } // Important for touch devices
    }
  });

  const gestures = bind();

  return (
    <div
      {...gestures}
      className={cn("absolute w-3 h-3 bg-white border border-blue-500 rounded-full z-50 hover:scale-125 transition-transform", className)}
      style={{ cursor, touchAction: 'none' }}
      onPointerDown={(e) => {
        gestures.onPointerDown?.(e as any);
        e.stopPropagation();
      }}
    />
  );
};

interface CanvasObjectRendererProps {
  object: CanvasObject;
}

const CanvasObjectRendererComponent: React.FC<CanvasObjectRendererProps> = ({ object }) => {
  // Use selective selectors to avoid unnecessary re-renders when viewport changes
  const isSelected = useCanvasStore((state) => state.selectedObjectIds.includes(object.id));
  const isEditing = useCanvasStore((state) => state.editingObjectId === object.id);
  
  const updateObject = useCanvasStore((state) => state.updateObject);
  const updateObjects = useCanvasStore((state) => state.updateObjects);
  const removeObject = useCanvasStore((state) => state.removeObject);
  const selectObject = useCanvasStore((state) => state.selectObject);
  const toggleObjectSelection = useCanvasStore((state) => state.toggleObjectSelection);
  const setEditingObjectId = useCanvasStore((state) => state.setEditingObjectId);

  const handleFinishEdit = () => {
    setEditingObjectId(null);
    if (object.type === 'text') {
      const textObject = object as any;
      if (!textObject.content || textObject.content.trim() === '') {
        removeObject(object.id);
      }
    }
  };

  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy], event, first, buttons, shiftKey }) => {
        // Only handle Left Click (buttons === 1) for moving objects
        if (buttons === 1) {
          // Stop propagation so canvas doesn't pan
          (event as any).stopPropagation();
          
          if (first) {
            // If dragging an unselected object, select it (unless shift is held, handled in onClick, 
            // but dragging usually implies selection).
            // Standard behavior: 
            // - If not selected, select it (clearing others).
            // - If selected, keep selection and move all.
            const { selectedObjectIds } = useCanvasStore.getState();
            if (!selectedObjectIds.includes(object.id)) {
                if (shiftKey) {
                    toggleObjectSelection(object.id);
                } else {
                    selectObject(object.id);
                }
            }
          }

          // Access viewport zoom directly from store state to avoid subscription
          const { viewport, selectedObjectIds, objects } = useCanvasStore.getState();
          const zoom = viewport.zoom;
          const deltaX = dx / zoom;
          const deltaY = dy / zoom;

          // If current object is selected, move all selected objects
          if (selectedObjectIds.includes(object.id)) {
            const updates = selectedObjectIds.map(id => {
                const obj = objects.find(o => o.id === id);
                if (obj) {
                    return {
                        id,
                        changes: {
                            position: {
                                x: obj.position.x + deltaX,
                                y: obj.position.y + deltaY
                            }
                        }
                    };
                }
                return null;
            }).filter(Boolean) as { id: string; changes: Partial<CanvasObject> }[];
            
            updateObjects(updates);
          } else {
            // Fallback for single object move (should be covered above, but safe to keep)
            updateObject(object.id, {
                position: {
                  x: object.position.x + deltaX,
                  y: object.position.y + deltaY
                }
              });
          }
        }
      }
    },
    {
      drag: {
        filterTaps: true
      }
    }
  );

  const gestures = bind();
  // Extract onPointerDown to handle stopPropagation
  const { onPointerDown, ...restGestures } = gestures;

  const handleResize = (delta: [number, number], direction: { x: -1 | 0 | 1, y: -1 | 0 | 1 }) => {
    const zoom = useCanvasStore.getState().viewport.zoom;
    const dx = delta[0] / zoom;
    const dy = delta[1] / zoom;

    const currentWidth = object.size.width;
    const currentHeight = object.size.height;
    const currentX = object.position.x;
    const currentY = object.position.y;

    let newWidth = currentWidth;
    let newHeight = currentHeight;
    let newX = currentX;
    let newY = currentY;

    // Calculate new dimensions and position based on direction
    if (direction.x === 1) {
      newWidth = Math.max(20, currentWidth + dx);
    } else if (direction.x === -1) {
      const w = Math.max(20, currentWidth - dx);
      newX += currentWidth - w; // Adjust X to keep right side fixed
      newWidth = w;
    }

    if (direction.y === 1) {
      newHeight = Math.max(20, currentHeight + dy);
    } else if (direction.y === -1) {
      const h = Math.max(20, currentHeight - dy);
      newY += currentHeight - h; // Adjust Y to keep bottom side fixed
      newHeight = h;
    }

    updateObject(object.id, {
      size: { width: newWidth, height: newHeight },
      position: { x: newX, y: newY }
    });
  };

  const renderContent = () => {
    switch (object.type) {
      case 'image':
        return <ImageRenderer object={object as any} />;
      case 'video':
        return <VideoRenderer object={object as any} />;
      case 'text':
        return (
          <TextRenderer 
            object={object as any} 
            isEditing={isEditing}
            onUpdate={(updates) => updateObject(object.id, updates)}
            onFinishEdit={handleFinishEdit}
          />
        );
      case 'group':
        return <GroupRenderer object={object as any} />;
      default:
        return null;
    }
  };

  return (
    <div
      {...restGestures}
      onPointerDown={(e) => {
        onPointerDown?.(e as any);
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.shiftKey) {
            toggleObjectSelection(object.id);
        } else if (!isSelected) {
            selectObject(object.id);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (object.type === 'text') {
          setEditingObjectId(object.id);
        } else if (object.type === 'image') {
          // Reset image to original size
          const imgObject = object as ImageObject;
          const img = new Image();
          img.src = imgObject.src;
          img.onload = () => {
             updateObject(object.id, {
               size: { width: img.width, height: img.height }
             });
          };
        }
      }}
      className={cn(
        "absolute touch-none select-none box-border transition-shadow group",
        isSelected && !isEditing && "ring-2 ring-blue-500 shadow-lg",
      )}
      style={{
        left: object.position.x,
        top: object.position.y,
        width: object.size.width,
        height: object.size.height,
        zIndex: object.zIndex,
        touchAction: 'none'
      }}
    >
      {renderContent()}

      {/* Resize Handles - Only show when selected and not editing text */}
      {isSelected && !isEditing && (
        <>
          {/* Top Left */}
          <ResizeHandle 
            cursor="nw-resize" 
            className="-top-1.5 -left-1.5"
            onResize={(delta) => handleResize(delta, { x: -1, y: -1 })}
          />
          {/* Top Right */}
          <ResizeHandle 
            cursor="ne-resize" 
            className="-top-1.5 -right-1.5"
            onResize={(delta) => handleResize(delta, { x: 1, y: -1 })}
          />
          {/* Bottom Left */}
          <ResizeHandle 
            cursor="sw-resize" 
            className="-bottom-1.5 -left-1.5"
            onResize={(delta) => handleResize(delta, { x: -1, y: 1 })}
          />
          {/* Bottom Right */}
          <ResizeHandle 
            cursor="se-resize" 
            className="-bottom-1.5 -right-1.5"
            onResize={(delta) => handleResize(delta, { x: 1, y: 1 })}
          />
        </>
      )}
    </div>
  );
};

export const CanvasObjectRenderer = React.memo(CanvasObjectRendererComponent);

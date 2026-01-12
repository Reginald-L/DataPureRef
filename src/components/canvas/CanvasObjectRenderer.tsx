import React from 'react';
import { useGesture } from '@use-gesture/react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { CanvasObject } from '../../types/canvas';
import { ImageRenderer } from './renderers/ImageRenderer';
import { VideoRenderer } from './renderers/VideoRenderer';
import { TextRenderer } from './renderers/TextRenderer';
import { cn } from '../../lib/utils';

interface CanvasObjectRendererProps {
  object: CanvasObject;
}

const CanvasObjectRendererComponent: React.FC<CanvasObjectRendererProps> = ({ object }) => {
  // Use selective selectors to avoid unnecessary re-renders when viewport changes
  const isSelected = useCanvasStore((state) => state.selectedObjectId === object.id);
  const isEditing = useCanvasStore((state) => state.editingObjectId === object.id);
  
  const updateObject = useCanvasStore((state) => state.updateObject);
  const removeObject = useCanvasStore((state) => state.removeObject);
  const selectObject = useCanvasStore((state) => state.selectObject);
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
      onDrag: ({ delta: [dx, dy], event, first, buttons }) => {
        // Only handle Left Click (buttons === 1) for moving objects
        if (buttons === 1) {
          // Stop propagation so canvas doesn't pan
          (event as any).stopPropagation();
          
          if (first) {
            selectObject(object.id);
          }

          // Access viewport zoom directly from store state to avoid subscription
          const zoom = useCanvasStore.getState().viewport.zoom;

          updateObject(object.id, {
            position: {
              x: object.position.x + dx / zoom,
              y: object.position.y + dy / zoom
            }
          });
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
        if (!isSelected) {
          selectObject(object.id);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (object.type === 'text') {
          setEditingObjectId(object.id);
        }
      }}
      className={cn(
        "absolute touch-none select-none box-border transition-shadow",
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
    </div>
  );
};

export const CanvasObjectRenderer = React.memo(CanvasObjectRendererComponent);

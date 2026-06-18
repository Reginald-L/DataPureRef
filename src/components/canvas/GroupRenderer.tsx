import React from 'react';
import { GroupObject } from '../../types/canvas';
import { ImageRenderer } from './renderers/ImageRenderer';
import { VideoRenderer } from './renderers/VideoRenderer';
import { TextRenderer } from './renderers/TextRenderer';

interface GroupRendererProps {
  object: GroupObject;
}

export const GroupRenderer: React.FC<GroupRendererProps> = ({ object }) => {
  const sortedChildren = [...object.children].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="relative w-full h-full">
      {sortedChildren.map((child, index) => (
        <div
          key={child.id}
          className="absolute"
          style={{
            left: child.position.x,
            top: child.position.y,
            width: child.size.width,
            height: child.size.height,
            zIndex: index + 1,
          }}
        >
          {child.type === 'image' && <ImageRenderer object={child as any} />}
          {child.type === 'video' && <VideoRenderer object={child as any} />}
          {child.type === 'text' && (
            <TextRenderer 
              object={child as any} 
              isEditing={false} // Disable editing inside group for now
              onUpdate={() => {}} 
              onFinishEdit={() => {}}
            />
          )}
        </div>
      ))}
    </div>
  );
};

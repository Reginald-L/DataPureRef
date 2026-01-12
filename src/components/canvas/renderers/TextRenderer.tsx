import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { TextObject } from '../../../types/canvas';

interface TextRendererProps {
  object: TextObject;
  isEditing: boolean;
  onUpdate: (updates: Partial<TextObject>) => void;
  onFinishEdit: () => void;
}

export const TextRenderer: React.FC<TextRendererProps> = ({
  object,
  isEditing,
  onUpdate,
  onFinishEdit
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(object.content);

  useEffect(() => {
    setValue(object.content);
  }, [object.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Only select all on initial focus, not every render
      if (document.activeElement !== textareaRef.current) {
          // textareaRef.current.select(); // Optional: select all text
      }
    }
  }, [isEditing]);

  // Auto-resize logic
  useLayoutEffect(() => {
    const measureHeight = () => {
      // Create a temporary element to measure height accurately
      // We can't use the existing element reliably because its height might be constrained by parent
      const measureDiv = document.createElement('div');
      measureDiv.style.width = `${object.size.width}px`;
      measureDiv.style.fontSize = `${object.fontSize}px`;
      measureDiv.style.fontWeight = object.fontWeight;
      measureDiv.style.fontStyle = object.fontStyle;
      measureDiv.style.whiteSpace = 'pre-wrap';
      measureDiv.style.wordBreak = 'break-word';
      measureDiv.style.padding = '8px'; // Match p-2 (0.5rem = 8px)
      measureDiv.style.visibility = 'hidden';
      measureDiv.style.position = 'absolute';
      measureDiv.style.lineHeight = 'normal'; // Ensure default line height matches
      
      // For textarea measurement (editing mode), we need to match textarea styles
      if (isEditing) {
          measureDiv.style.border = '1px solid transparent'; // Match border width
      }

      measureDiv.textContent = value || 'Double click to edit'; // Measure placeholder if empty
      
      document.body.appendChild(measureDiv);
      const height = measureDiv.getBoundingClientRect().height;
      document.body.removeChild(measureDiv);

      return height;
    };

    const newHeight = measureHeight();
    
    // Add a small buffer or ensure minimum height
    const finalHeight = Math.max(50, Math.ceil(newHeight));

    if (Math.abs(finalHeight - object.size.height) > 2) { // 2px threshold to avoid loops
      onUpdate({ size: { ...object.size, height: finalHeight } });
    }
  }, [value, object.size.width, object.fontSize, object.fontWeight, object.fontStyle, isEditing, object.size.height, onUpdate]);


  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    onUpdate({ content: e.target.value });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onFinishEdit();
    }
  };

  const handleBlur = () => {
    onFinishEdit();
  };

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-full h-full bg-black/50 text-white p-2 outline-none resize-none border border-blue-500 rounded overflow-hidden"
        style={{
          fontSize: object.fontSize,
          fontWeight: object.fontWeight,
          fontStyle: object.fontStyle,
          color: object.color
        }}
        onPointerDown={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div
      ref={divRef}
      className="w-full h-full p-2 whitespace-pre-wrap break-words"
      style={{
        fontSize: object.fontSize,
        fontWeight: object.fontWeight,
        fontStyle: object.fontStyle,
        color: object.color,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '4px'
      }}
    >
      {object.content || <span className="text-gray-400 italic">Double click to edit</span>}
    </div>
  );
};

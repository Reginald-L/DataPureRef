
import React, { useState } from 'react';

interface GridLayoutPickerProps {
  onSelect: (cols: number, rows: number) => void;
  maxCols?: number;
  maxRows?: number;
}

export const GridLayoutPicker: React.FC<GridLayoutPickerProps> = ({ 
  onSelect, 
  maxCols = 6, 
  maxRows = 6 
}) => {
  const [hovered, setHovered] = useState<{ col: number; row: number } | null>(null);

  const handleMouseEnter = (col: number, row: number) => {
    setHovered({ col, row });
  };

  const handleMouseLeave = () => {
    setHovered(null);
  };

  const handleClick = (col: number, row: number) => {
    onSelect(col, row);
  };

  return (
    <div className="p-2" onMouseLeave={handleMouseLeave}>
      <div className="mb-2 text-xs text-gray-400 text-center">
        {hovered ? `${hovered.col} x ${hovered.row} Grid` : 'Select Layout'}
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)` }}>
        {Array.from({ length: maxRows }).map((_, rowIndex) => (
          Array.from({ length: maxCols }).map((_, colIndex) => {
            const row = rowIndex + 1;
            const col = colIndex + 1;
            const isHovered = hovered && col <= hovered.col && row <= hovered.row;

            return (
              <div
                key={`${row}-${col}`}
                className={`w-4 h-4 border border-gray-600 rounded-sm cursor-pointer transition-colors ${
                  isHovered ? 'bg-blue-500 border-blue-400' : 'bg-[#1f1f1f] hover:border-gray-400'
                }`}
                onMouseEnter={() => handleMouseEnter(col, row)}
                onClick={() => handleClick(col, row)}
              />
            );
          })
        ))}
      </div>
    </div>
  );
};

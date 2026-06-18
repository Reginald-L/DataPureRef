import React, { useMemo, useState } from 'react';

interface GridLayoutPickerProps {
  onSelect: (cols: number, rows: number, gap?: number) => void;
  maxCols?: number;
  maxRows?: number;
}

export const GridLayoutPicker: React.FC<GridLayoutPickerProps> = ({ 
  onSelect, 
  maxCols = 6, 
  maxRows = 6 
}) => {
  const [hovered, setHovered] = useState<{ col: number; row: number } | null>(null);
  const [customCols, setCustomCols] = useState(6);
  const [customRows, setCustomRows] = useState(6);
  const [gap, setGap] = useState(20);

  const previewLabel = useMemo(() => {
    if (hovered) return `${hovered.col} x ${hovered.row}`;
    return `${customCols} x ${customRows}`;
  }, [hovered, customCols, customRows]);

  const handleMouseEnter = (col: number, row: number) => {
    setHovered({ col, row });
  };

  const handleMouseLeave = () => {
    setHovered(null);
  };

  const handleClick = (col: number, row: number) => {
    setCustomCols(col);
    setCustomRows(row);
    onSelect(col, row, gap);
  };

  const handleApply = () => {
    onSelect(Math.max(1, customCols), Math.max(1, customRows), Math.max(0, gap));
  };

  const handleReset = () => {
    setCustomCols(6);
    setCustomRows(6);
    setGap(20);
    onSelect(6, 6, 20);
  };

  return (
    <div className="w-[248px] rounded-2xl border border-white/10 bg-[#22252c] p-3 text-gray-200 shadow-2xl" onMouseLeave={handleMouseLeave}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Grid Layout</div>
          <div className="text-xs text-gray-400">Default 6 x 6, but customizable</div>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-white/10 px-2 py-1 text-xs text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          6 x 6
        </button>
      </div>

      <div className="mb-3 rounded-xl border border-white/10 bg-black/20 p-2">
        <div className="mb-2 text-center text-sm font-medium text-blue-300">
          {previewLabel} Grid
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)` }}>
        {Array.from({ length: maxRows }).map((_, rowIndex) => (
          Array.from({ length: maxCols }).map((_, colIndex) => {
            const row = rowIndex + 1;
            const col = colIndex + 1;
            const isHovered = hovered && col <= hovered.col && row <= hovered.row;
            const isSelected = !hovered && col <= customCols && row <= customRows;

            return (
              <div
                key={`${row}-${col}`}
                className={`h-5 w-5 rounded-[4px] border cursor-pointer transition-colors ${
                  isHovered || isSelected
                    ? 'border-blue-300 bg-blue-500'
                    : 'border-white/10 bg-[#171a20] hover:border-white/25'
                }`}
                onMouseEnter={() => handleMouseEnter(col, row)}
                onClick={() => handleClick(col, row)}
              />
            );
          })
        ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="grid grid-cols-3 gap-2">
          <label className="col-span-1 text-xs text-gray-400">
            Cols
            <input
              type="number"
              min={1}
              max={24}
              value={customCols}
              onChange={(e) => setCustomCols(Math.min(24, Math.max(1, Number(e.target.value) || 1)))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#171a20] px-2 py-1.5 text-sm text-white outline-none focus:border-blue-400"
            />
          </label>
          <label className="col-span-1 text-xs text-gray-400">
            Rows
            <input
              type="number"
              min={1}
              max={24}
              value={customRows}
              onChange={(e) => setCustomRows(Math.min(24, Math.max(1, Number(e.target.value) || 1)))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#171a20] px-2 py-1.5 text-sm text-white outline-none focus:border-blue-400"
            />
          </label>
          <label className="col-span-1 text-xs text-gray-400">
            Gap
            <input
              type="number"
              min={0}
              max={200}
              value={gap}
              onChange={(e) => setGap(Math.min(200, Math.max(0, Number(e.target.value) || 0)))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#171a20] px-2 py-1.5 text-sm text-white outline-none focus:border-blue-400"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleApply}
          className="w-full rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-400"
        >
          Apply Layout
        </button>
      </div>
    </div>
  );
};

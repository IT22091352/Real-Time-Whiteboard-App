'use client';

import React from 'react';
import { MousePointer2 } from 'lucide-react';
import { CursorPosition } from '../../types/whiteboard';

interface CursorOverlayProps {
  cursors: Map<string, CursorPosition>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  pan?: { x: number; y: number };
  zoom?: number;
}

export const CursorOverlay: React.FC<CursorOverlayProps> = ({
  cursors,
  containerRef,
  pan = { x: 0, y: 0 },
  zoom = 1.0,
}) => {
  if (cursors.size === 0) return null;

  const rect = containerRef.current?.getBoundingClientRect();
  const width = rect ? rect.width : 1000;
  const height = rect ? rect.height : 600;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {Array.from(cursors.values()).map((cursor) => {
        const leftPx = cursor.x * width * zoom + pan.x;
        const topPx = cursor.y * height * zoom + pan.y;

        return (
          <div
            key={cursor.userId}
            style={{
              left: `${leftPx}px`,
              top: `${topPx}px`,
              transition: 'left 0.05s linear, top 0.05s linear',
            }}
            className="absolute transform -translate-x-1 -translate-y-1 flex items-center gap-1"
          >
            <MousePointer2
              className="w-4 h-4"
              style={{ color: cursor.color, fill: cursor.color }}
            />
            <span
              style={{ backgroundColor: cursor.color }}
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shadow-md whitespace-nowrap opacity-90"
            >
              {cursor.userName}
            </span>
          </div>
        );
      })}
    </div>
  );
};

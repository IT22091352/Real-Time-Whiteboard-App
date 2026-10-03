'use client';

import React, { useEffect, useRef } from 'react';
import { AIGenerateWhiteboardResponse } from '@/types/ai';

interface AIGenerateModalProps {
  isOpen: boolean;
  generatedData: AIGenerateWhiteboardResponse | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AIGenerateModal: React.FC<AIGenerateModalProps> = ({
  isOpen,
  generatedData,
  onConfirm,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen || !generatedData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 0, width, height);

    // Draw subtle grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(0, height);
      ctx.stroke();
    }

    const objects = generatedData.objects || [];
    const objectMap = new Map<string, any>();
    objects.forEach((obj) => objectMap.set(obj.id, obj));

    // First pass: Draw connections / lines / arrows
    objects.forEach((obj) => {
      if (['arrow', 'line', 'connector'].includes(obj.type)) {
        let startX = (obj.x ?? 0.1) * width;
        let startY = (obj.y ?? 0.1) * height;
        let endX = startX + (obj.width ?? 0.1) * width;
        let endY = startY + (obj.height ?? 0.1) * height;

        if (obj.fromId && objectMap.has(obj.fromId)) {
          const fromObj = objectMap.get(obj.fromId);
          startX = ((fromObj.x ?? 0.1) + (fromObj.width ?? 0.15) / 2) * width;
          startY = ((fromObj.y ?? 0.1) + (fromObj.height ?? 0.08) / 2) * height;
        }
        if (obj.toId && objectMap.has(obj.toId)) {
          const toObj = objectMap.get(obj.toId);
          endX = ((toObj.x ?? 0.1) + (toObj.width ?? 0.15) / 2) * width;
          endY = ((toObj.y ?? 0.1) + (toObj.height ?? 0.08) / 2) * height;
        }

        ctx.strokeStyle = obj.color || obj.strokeColor || '#818cf8';
        ctx.lineWidth = obj.size || obj.strokeWidth || 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrow head
        if (['arrow', 'connector'].includes(obj.type)) {
          const angle = Math.atan2(endY - startY, endX - startX);
          const headLen = 8;
          ctx.fillStyle = ctx.strokeStyle;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLen * Math.cos(angle - Math.PI / 6),
            endY - headLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            endX - headLen * Math.cos(angle + Math.PI / 6),
            endY - headLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
      }
    });

    // Second pass: Draw shapes and text
    objects.forEach((obj) => {
      if (['arrow', 'line', 'connector'].includes(obj.type)) return;

      const x = (obj.x ?? 0.1) * width;
      const y = (obj.y ?? 0.1) * height;
      const w = (obj.width ?? 0.15) * width;
      const h = (obj.height ?? 0.08) * height;

      ctx.strokeStyle = obj.color || obj.strokeColor || '#a5b4fc';
      ctx.fillStyle = obj.fillColor || (obj.type === 'sticky' ? '#fef08a' : 'rgba(30, 27, 75, 0.8)');
      ctx.lineWidth = obj.size || obj.strokeWidth || 2;

      ctx.beginPath();
      if (obj.type === 'ellipse') {
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      } else if (obj.type === 'diamond') {
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h / 2);
        ctx.lineTo(x + w / 2, y + h);
        ctx.lineTo(x, y + h / 2);
        ctx.closePath();
      } else if (obj.type === 'triangle') {
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
      } else {
        // Rectangle / Sticky / Default
        ctx.rect(x, y, w, h);
      }
      ctx.fill();
      ctx.stroke();

      // Render Text inside shape
      if (obj.text) {
        ctx.fillStyle = obj.type === 'sticky' ? '#1e293b' : '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const maxTextWidth = Math.max(10, w - 8);
        let displayText = obj.text;
        if (ctx.measureText(displayText).width > maxTextWidth) {
          while (displayText.length > 3 && ctx.measureText(displayText + '...').width > maxTextWidth) {
            displayText = displayText.slice(0, -1);
          }
          displayText += '...';
        }
        ctx.fillText(displayText, x + w / 2, y + h / 2);
      }
    });
  }, [isOpen, generatedData]);

  if (!isOpen || !generatedData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fadeIn p-3 sm:p-4">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-indigo-500/30 bg-slate-900 p-4 sm:p-6 shadow-2xl backdrop-blur-xl text-slate-100">
        <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3 sm:pb-4 mb-3 sm:mb-4">
          <div className="flex items-center space-x-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/30 text-lg sm:text-xl border border-indigo-400/40 shrink-0">
              ✨
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide truncate">
                AI Generated Whiteboard
              </h2>
              <p className="text-[11px] sm:text-xs text-indigo-300 truncate">
                Preview before adding to collaborative board
              </p>
            </div>
          </div>
          <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-[10px] sm:text-xs font-semibold text-indigo-300 border border-indigo-500/30 shrink-0">
            {generatedData.objects.length} objects
          </span>
        </div>

        <div className="mb-3 sm:mb-4">
          <h3 className="text-sm sm:text-base font-semibold text-indigo-200">
            {generatedData.title}
          </h3>
          <p className="text-xs text-slate-300 mt-1 line-clamp-2">
            {generatedData.description}
          </p>
        </div>

        {/* Canvas Preview */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-slate-950 shadow-inner">
          <canvas
            ref={canvasRef}
            width={520}
            height={260}
            className="w-full h-auto block max-h-[220px] object-contain"
          />
          <div className="absolute top-2 right-2 rounded-md bg-slate-900/80 px-2 py-1 text-[10px] text-slate-400 border border-slate-700">
            Live Preview
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="mt-5 flex items-center justify-end space-x-3 border-t border-indigo-500/20 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-all hover:bg-slate-700 hover:text-white min-h-[44px] flex items-center justify-center active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-400 hover:to-purple-500 min-h-[44px] active:scale-95"
          >
            <span>✨ Add to Board</span>
          </button>
        </div>
      </div>
    </div>
  );
};

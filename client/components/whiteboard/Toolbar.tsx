'use client';

import React, { useState } from 'react';
import {
  Pencil,
  Eraser,
  Highlighter as HighlighterIcon,
  MousePointer,
  Hand,
  Radio,
  Minus,
  Plus,
  MoveRight,
  Square,
  Circle,
  Triangle,
  Diamond,
  Shapes,
  Type,
  StickyNote,
  GitFork,
  Image as ImageIcon,
  FileText,
  Grid,
  Magnet,
  Lock,
  Unlock,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Palette,
  Sparkles,
  Loader2,
  MoreHorizontal,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DrawingTool, UserRole } from '../../types/whiteboard';
import { cn } from '../../lib/utils';

interface ToolbarProps {
  tool: DrawingTool;
  color: string;
  fillColor?: string;
  size: number;
  isAIAnalyzing?: boolean;
  selectedId?: string | null;
  selectedIds?: string[];
  gridMode?: 'off' | 'dot' | 'line';
  snapToGrid?: boolean;
  isLocked?: boolean;
  userRole?: UserRole;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (color: string) => void;
  onFillColorChange?: (fillColor: string) => void;
  onSizeChange: (size: number) => void;
  onGridModeChange?: (mode: 'off' | 'dot' | 'line') => void;
  onToggleSnapToGrid?: () => void;
  onToggleLock?: () => void;
  onOpenImageModal?: () => void;
  onOpenPdfModal?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  onDeleteSelected?: () => void;
  onAnalyzeAI?: () => void;
  onAskAI?: () => void;
}

const COLOR_PRESETS = [
  '#000000', // Black
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ffffff', // White
];

const SHAPE_TOOLS: { tool: DrawingTool; label: string; icon: React.FC<{ className?: string }> }[] = [
  { tool: 'line', label: 'Line', icon: Minus },
  { tool: 'arrow', label: 'Arrow', icon: MoveRight },
  { tool: 'rectangle', label: 'Rectangle', icon: Square },
  { tool: 'ellipse', label: 'Circle', icon: Circle },
  { tool: 'triangle', label: 'Triangle', icon: Triangle },
  { tool: 'diamond', label: 'Diamond', icon: Diamond },
  { tool: 'polygon', label: 'Polygon', icon: Shapes },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  color,
  fillColor = 'transparent',
  size,
  isAIAnalyzing = false,
  selectedId = null,
  selectedIds = [],
  gridMode = 'dot',
  snapToGrid = false,
  isLocked = false,
  userRole = 'EDITOR',
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToolChange,
  onColorChange,
  onFillColorChange,
  onSizeChange,
  onGridModeChange,
  onToggleSnapToGrid,
  onToggleLock,
  onOpenImageModal,
  onOpenPdfModal,
  onUndo,
  onRedo,
  onClear,
  onExport,
  onDeleteSelected,
  onAnalyzeAI,
  onAskAI,
}) => {
  const [isShapesPopoverOpen, setIsShapesPopoverOpen] = useState(false);
  const [isSizePopoverOpen, setIsSizePopoverOpen] = useState(false);
  const [activeMobileMenu, setActiveMobileMenu] = useState<'none' | 'shapes' | 'objects' | 'media' | 'style' | 'more'>('none');

  const SIZE_STEPS = [1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64];

  const handleDecreaseSize = () => {
    const currentVal = tool === 'text' ? Math.max(12, size * 4) : size;
    const lowerSteps = SIZE_STEPS.filter((s) => s < currentVal);
    const nextVal = lowerSteps.length > 0 ? lowerSteps[lowerSteps.length - 1] : 1;
    onSizeChange(tool === 'text' ? Math.round(nextVal / 4) : nextVal);
  };

  const handleIncreaseSize = () => {
    const currentVal = tool === 'text' ? Math.max(12, size * 4) : size;
    const higherSteps = SIZE_STEPS.filter((s) => s > currentVal);
    const nextVal = higherSteps.length > 0 ? higherSteps[0] : 64;
    onSizeChange(tool === 'text' ? Math.round(nextVal / 4) : nextVal);
  };

  const isShapeActive = SHAPE_TOOLS.some((s) => s.tool === tool);
  const activeShapeObj = SHAPE_TOOLS.find((s) => s.tool === tool) || SHAPE_TOOLS[2]; // Default rectangle
  const ActiveShapeIcon = activeShapeObj.icon;

  return (
    <div className="fixed bottom-3 sm:bottom-6 inset-x-0 mx-auto w-fit z-40 flex flex-col items-center gap-2 max-w-[95vw] pointer-events-none">
      {/* DESKTOP SHAPES POPOVER MENU */}
      {isShapesPopoverOpen && (
        <div className="pointer-events-auto hidden sm:flex items-center gap-1 bg-slate-900/95 backdrop-blur-2xl border border-slate-800 p-2 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 mb-1">
          {SHAPE_TOOLS.map((st) => {
            const IconComponent = st.icon;
            return (
              <button
                key={st.tool}
                onClick={() => {
                  onToolChange(st.tool);
                  setIsShapesPopoverOpen(false);
                }}
                title={`${st.label} Tool`}
                className={cn(
                  'p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-medium',
                  tool === st.tool ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                )}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-[11px]">{st.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* MOBILE EXPANDED POPOVERS / SHEETS */}
      {activeMobileMenu !== 'none' && (
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-2xl border border-slate-800 text-slate-100 p-3 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-w-[94vw] w-full flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-300 capitalize flex items-center gap-1.5">
              {activeMobileMenu === 'shapes' && <Shapes className="w-4 h-4 text-blue-400" />}
              {activeMobileMenu === 'objects' && <Type className="w-4 h-4 text-amber-400" />}
              {activeMobileMenu === 'media' && <ImageIcon className="w-4 h-4 text-emerald-400" />}
              {activeMobileMenu === 'style' && <Palette className="w-4 h-4 text-purple-400" />}
              {activeMobileMenu === 'more' && <MoreHorizontal className="w-4 h-4 text-emerald-400" />}
              <span>{activeMobileMenu} Menu</span>
            </span>
            <button
              onClick={() => setActiveMobileMenu('none')}
              className="p-1 rounded-full hover:bg-slate-800 text-slate-400 min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shapes Menu Content */}
          {activeMobileMenu === 'shapes' && (
            <div className="grid grid-cols-4 gap-2">
              {SHAPE_TOOLS.map((st) => {
                const IconComponent = st.icon;
                return (
                  <button
                    key={st.tool}
                    onClick={() => {
                      onToolChange(st.tool);
                      setActiveMobileMenu('none');
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center p-2.5 rounded-2xl border border-slate-800 min-h-[54px] gap-1 transition-all active:scale-95 text-xs',
                      tool === st.tool ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                    )}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{st.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Objects Menu Content */}
          {activeMobileMenu === 'objects' && (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  onToolChange('text');
                  setActiveMobileMenu('none');
                }}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-800 min-h-[56px] gap-1 transition-all active:scale-95 text-xs',
                  tool === 'text' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950/60 text-slate-300'
                )}
              >
                <Type className="w-5 h-5" />
                <span className="text-[11px] font-medium">Text</span>
              </button>

              <button
                onClick={() => {
                  onToolChange('sticky');
                  setActiveMobileMenu('none');
                }}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-800 min-h-[56px] gap-1 transition-all active:scale-95 text-xs',
                  tool === 'sticky' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-950/60 text-amber-400'
                )}
              >
                <StickyNote className="w-5 h-5" />
                <span className="text-[11px] font-medium">Sticky Note</span>
              </button>

              <button
                onClick={() => {
                  onToolChange('connector');
                  setActiveMobileMenu('none');
                }}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-800 min-h-[56px] gap-1 transition-all active:scale-95 text-xs',
                  tool === 'connector' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950/60 text-slate-300'
                )}
              >
                <GitFork className="w-5 h-5" />
                <span className="text-[11px] font-medium">Connector</span>
              </button>
            </div>
          )}

          {/* Media Menu (Image & PDF) */}
          {activeMobileMenu === 'media' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (onOpenImageModal) onOpenImageModal();
                  setActiveMobileMenu('none');
                }}
                className="flex items-center justify-center gap-2 p-3 bg-slate-950/60 border border-slate-800 hover:bg-slate-800 rounded-2xl text-xs font-semibold text-emerald-400"
              >
                <ImageIcon className="w-5 h-5" />
                Upload Image
              </button>

              <button
                onClick={() => {
                  if (onOpenPdfModal) onOpenPdfModal();
                  setActiveMobileMenu('none');
                }}
                className="flex items-center justify-center gap-2 p-3 bg-slate-950/60 border border-slate-800 hover:bg-slate-800 rounded-2xl text-xs font-semibold text-purple-400"
              >
                <FileText className="w-5 h-5" />
                Import PDF
              </button>
            </div>
          )}

          {/* Style (Colors & Size) Content */}
          {activeMobileMenu === 'style' && (
            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 mb-1.5 block">Stroke Color</span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => onColorChange(c)}
                      style={{ backgroundColor: c }}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 border-slate-800 shrink-0 transition-transform active:scale-110 min-w-[32px] min-h-[32px]',
                        color === c && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 scale-110'
                      )}
                    />
                  ))}
                  <label className="relative cursor-pointer w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 min-w-[32px] min-h-[32px]">
                    <Palette className="w-4 h-4 text-slate-300" />
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => onColorChange(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400">
                    {tool === 'text' ? 'Font Size:' : 'Stroke Size:'}
                  </span>
                  <span className="font-mono text-slate-200">
                    {tool === 'text' ? `${Math.max(12, size * 4)}px` : `${size}px`}
                  </span>
                </div>
                <input
                  type="range"
                  min={tool === 'text' ? 12 : 2}
                  max={tool === 'text' ? 64 : 40}
                  value={tool === 'text' ? Math.max(12, size * 4) : size}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onSizeChange(tool === 'text' ? Math.round(val / 4) : val);
                  }}
                  className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg cursor-pointer min-h-[36px]"
                />
              </div>
            </div>
          )}

          {/* More Actions Content */}
          {activeMobileMenu === 'more' && (
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => {
                  onUndo();
                  setActiveMobileMenu('none');
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950/60 border border-slate-800 min-h-[54px] gap-1 text-slate-300 active:scale-95"
              >
                <Undo2 className="w-5 h-5 text-blue-400" />
                <span className="text-[10px]">Undo</span>
              </button>

              <button
                onClick={() => {
                  onRedo();
                  setActiveMobileMenu('none');
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950/60 border border-slate-800 min-h-[54px] gap-1 text-slate-300 active:scale-95"
              >
                <Redo2 className="w-5 h-5 text-blue-400" />
                <span className="text-[10px]">Redo</span>
              </button>

              <button
                onClick={() => {
                  onExport();
                  setActiveMobileMenu('none');
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950/60 border border-slate-800 min-h-[54px] gap-1 text-emerald-400 active:scale-95"
              >
                <Download className="w-5 h-5" />
                <span className="text-[10px]">Export PNG</span>
              </button>

              <button
                onClick={() => {
                  onClear();
                  setActiveMobileMenu('none');
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950/60 border border-slate-800 min-h-[54px] gap-1 text-red-400 active:scale-95"
              >
                <Trash2 className="w-5 h-5" />
                <span className="text-[10px]">Clear Board</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MAIN TOOLBAR CONTAINER */}
      <div className="pointer-events-auto flex items-center justify-center gap-1 sm:gap-1.5 bg-slate-900/95 backdrop-blur-2xl border border-slate-800 text-slate-100 p-1.5 sm:px-3 sm:py-2 rounded-3xl shadow-2xl max-w-full overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {/* HOST CLASSROOM LOCK BUTTON */}
        {userRole === 'HOST' && onToggleLock && (
          <button
            onClick={onToggleLock}
            title={isLocked ? 'Unlock Board for Students' : 'Lock Board (Host Only Editing)'}
            className={cn(
              'p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold mr-0.5 shrink-0',
              isLocked
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            )}
          >
            {isLocked ? <Lock className="w-4 h-4 text-amber-400 animate-pulse" /> : <Unlock className="w-4 h-4 text-slate-400" />}
            <span className="hidden xl:inline">{isLocked ? 'Locked' : 'Lock'}</span>
          </button>
        )}

        {/* SELECT & HAND & LASER TOOLS */}
        <div className="flex items-center gap-1 pr-1 sm:pr-1.5 border-r border-slate-800 shrink-0">
          <button
            onClick={() => onToolChange('select')}
            title="Select Object / Move (S)"
            className={cn(
              'p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-medium shrink-0',
              tool === 'select'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            )}
          >
            <MousePointer className="w-4 h-4" />
            <span className="hidden 2xl:inline">Select</span>
          </button>

          <button
            onClick={() => onToolChange('hand')}
            title="Hand / Pan Canvas (H)"
            className={cn(
              'p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-medium shrink-0',
              tool === 'hand'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            )}
          >
            <Hand className="w-4 h-4" />
            <span className="hidden 2xl:inline">Pan</span>
          </button>

          <button
            onClick={() => onToolChange('laser')}
            title="Laser Pointer (🔴 Ephemeral)"
            className={cn(
              'p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-medium shrink-0',
              tool === 'laser'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 animate-pulse'
                : 'hover:bg-slate-800 text-red-400 hover:text-red-300'
            )}
          >
            <Radio className="w-4 h-4" />
            <span className="hidden 2xl:inline">Laser</span>
          </button>
        </div>

        {/* DRAWING & HIGHLIGHTER TOOLS */}
        <div className="flex items-center gap-1 pr-1 sm:pr-1.5 border-r border-slate-800 shrink-0">
          <button
            onClick={() => onToolChange('brush')}
            title="Pen / Brush (B)"
            className={cn(
              'p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-medium shrink-0',
              tool === 'brush'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            )}
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden 2xl:inline">Pen</span>
          </button>

          <button
            onClick={() => onToolChange('highlighter')}
            title="Translucent Highlighter (🖍)"
            className={cn(
              'p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-medium shrink-0',
              tool === 'highlighter'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30'
                : 'hover:bg-slate-800 text-amber-400 hover:text-amber-300'
            )}
          >
            <HighlighterIcon className="w-4 h-4" />
            <span className="hidden 2xl:inline">Highlight</span>
          </button>

          <button
            onClick={() => onToolChange('eraser')}
            title="Eraser (E)"
            className={cn(
              'p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-medium shrink-0',
              tool === 'eraser'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            )}
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden 2xl:inline">Eraser</span>
          </button>
        </div>

        {/* MOBILE MENU TRIGGERS (ONLY SHOWN ON SM:HIDDEN) */}
        <div className="flex sm:hidden items-center gap-1 border-r border-slate-800 pr-1 shrink-0">
          <button
            onClick={() => setActiveMobileMenu(activeMobileMenu === 'shapes' ? 'none' : 'shapes')}
            title="Shapes Menu"
            className={cn(
              'p-2 rounded-xl transition-all shrink-0',
              activeMobileMenu === 'shapes' || isShapeActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Shapes className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveMobileMenu(activeMobileMenu === 'objects' ? 'none' : 'objects')}
            title="Text & Objects Menu"
            className={cn(
              'p-2 rounded-xl transition-all shrink-0',
              activeMobileMenu === 'objects' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Type className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveMobileMenu(activeMobileMenu === 'style' ? 'none' : 'style')}
            title="Colors & Stroke Style"
            className={cn(
              'p-2 rounded-xl transition-all shrink-0',
              activeMobileMenu === 'style' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveMobileMenu(activeMobileMenu === 'more' ? 'none' : 'more')}
            title="More Options"
            className={cn(
              'p-2 rounded-xl transition-all shrink-0',
              activeMobileMenu === 'more' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* MEDIA UPLOAD BUTTONS (IMAGE & PDF) */}
        <div className="hidden sm:flex items-center gap-1 pr-1.5 border-r border-slate-800 shrink-0">
          {onOpenImageModal && (
            <button
              onClick={onOpenImageModal}
              title="Upload Image (PNG/JPG/WEBP)"
              className="p-2 rounded-xl hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 text-xs font-medium shrink-0"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Image</span>
            </button>
          )}

          {onOpenPdfModal && (
            <button
              onClick={onOpenPdfModal}
              title="Import PDF Document"
              className="p-2 rounded-xl hover:bg-slate-800 text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 text-xs font-medium shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden lg:inline">PDF</span>
            </button>
          )}
        </div>

        {/* GRID & SNAP CONTROLS */}
        <div className="hidden lg:flex items-center gap-1 pr-1.5 border-r border-slate-800 shrink-0">
          {onGridModeChange && (
            <button
              onClick={() => {
                const nextMode = gridMode === 'off' ? 'dot' : gridMode === 'dot' ? 'line' : 'off';
                onGridModeChange(nextMode);
              }}
              title={`Grid Mode: ${gridMode.toUpperCase()} (Click to toggle)`}
              className={cn(
                'p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium shrink-0',
                gridMode !== 'off' ? 'bg-slate-800 text-blue-400' : 'hover:bg-slate-800 text-slate-500'
              )}
            >
              <Grid className="w-4 h-4" />
              <span className="text-[10px] uppercase font-mono">{gridMode}</span>
            </button>
          )}

          {onToggleSnapToGrid && (
            <button
              onClick={onToggleSnapToGrid}
              title={snapToGrid ? 'Snap to Grid: ON' : 'Snap to Grid: OFF'}
              className={cn(
                'p-2 rounded-xl transition-colors shrink-0',
                snapToGrid ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40' : 'hover:bg-slate-800 text-slate-500'
              )}
            >
              <Magnet className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* DESKTOP SHAPES POPOVER TRIGGER BUTTON */}
        <div className="hidden sm:flex items-center gap-1 pr-1.5 border-r border-slate-800 shrink-0">
          <button
            onClick={() => setIsShapesPopoverOpen((prev) => !prev)}
            title="Shapes Menu (Click to open shape tools)"
            className={cn(
              'p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-medium shrink-0',
              isShapeActive || isShapesPopoverOpen
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            )}
          >
            <ActiveShapeIcon className="w-4 h-4" />
            <span className="hidden xl:inline">{isShapeActive ? activeShapeObj.label : 'Shapes'}</span>
          </button>
        </div>

        {/* DESKTOP OBJECT TOOLS */}
        <div className="hidden sm:flex items-center gap-1 pr-1.5 border-r border-slate-800 shrink-0">
          <button
            onClick={() => onToolChange('text')}
            title="Text Tool (T)"
            className={cn(
              'p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-medium shrink-0',
              tool === 'text' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            )}
          >
            <Type className="w-4 h-4" />
            <span className="hidden lg:inline">Text</span>
          </button>

          <button
            onClick={() => onToolChange('sticky')}
            title="Sticky Note Tool"
            className={cn(
              'p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-medium shrink-0',
              tool === 'sticky' ? 'bg-amber-600 text-white' : 'hover:bg-slate-800 text-amber-400 hover:text-amber-300'
            )}
          >
            <StickyNote className="w-4 h-4" />
            <span className="hidden lg:inline">Sticky</span>
          </button>

          <button
            onClick={() => onToolChange('connector')}
            title="Connector Tool"
            className={cn(
              'p-2 rounded-xl transition-all shrink-0',
              tool === 'connector' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            )}
          >
            <GitFork className="w-4 h-4" />
          </button>
        </div>

        {/* DESKTOP COLORS & PALETTE */}
        <div className="hidden sm:flex items-center gap-1 px-1 pr-1.5 border-r border-slate-800 shrink-0">
          {COLOR_PRESETS.slice(0, 5).map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              style={{ backgroundColor: c }}
              className={cn(
                'w-5 h-5 rounded-full border border-slate-700 transition-transform hover:scale-110 focus:outline-none shrink-0',
                color === c && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 scale-110'
              )}
              title={c}
            />
          ))}

          <label className="relative cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0" title="Stroke Color">
            <Palette className="w-4 h-4 text-slate-400 hover:text-slate-200" />
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>

        {/* DESKTOP STROKE / ERASER / FONT SIZE CONTROL */}
        <div className="hidden sm:flex items-center gap-0.5 pr-1.5 border-r border-slate-800 shrink-0 relative bg-slate-950/60 p-0.5 rounded-xl border border-slate-800/80">
          <button
            onClick={handleDecreaseSize}
            title="Decrease Size (-)"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsSizePopoverOpen((prev) => !prev)}
            title={`Adjust ${tool === 'text' ? 'Font' : tool === 'eraser' ? 'Eraser' : 'Stroke'} Size (${tool === 'text' ? Math.max(12, size * 4) : size}px)`}
            className={cn(
              'px-2 py-1 rounded-lg transition-all flex items-center gap-1.5 text-xs font-mono font-medium text-slate-300 hover:text-white shrink-0 cursor-pointer',
              isSizePopoverOpen ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40' : 'hover:bg-slate-800/80'
            )}
          >
            <div
              style={{
                width: Math.max(5, Math.min(14, size)),
                height: Math.max(5, Math.min(14, size)),
              }}
              className="rounded-full bg-blue-400 shrink-0"
            />
            <span className="text-[11px] font-mono font-semibold">{tool === 'text' ? `${Math.max(12, size * 4)}px` : `${size}px`}</span>
          </button>

          <button
            onClick={handleIncreaseSize}
            title="Increase Size (+)"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Size Popover Slider Menu */}
          {isSizePopoverOpen && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-2xl border border-slate-800 p-3 rounded-2xl shadow-2xl z-50 flex flex-col gap-2.5 min-w-[180px] animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>{tool === 'text' ? 'Font Size' : tool === 'eraser' ? 'Eraser Size' : 'Stroke Size'}</span>
                <span className="text-blue-400 font-bold font-mono">{tool === 'text' ? `${Math.max(12, size * 4)}px` : `${size}px`}</span>
              </div>
              <input
                type="range"
                min={tool === 'text' ? 12 : tool === 'eraser' ? 4 : 1}
                max={tool === 'text' ? 64 : tool === 'eraser' ? 80 : 50}
                value={tool === 'text' ? Math.max(12, size * 4) : size}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onSizeChange(tool === 'text' ? Math.round(val / 4) : val);
                }}
                className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              {/* Quick Size Preset Buttons */}
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800">
                {(tool === 'eraser' ? [8, 16, 24, 40, 60] : tool === 'text' ? [14, 18, 24, 32, 48] : [2, 4, 8, 16, 28]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      onSizeChange(tool === 'text' ? Math.round(sz / 4) : sz);
                      setIsSizePopoverOpen(false);
                    }}
                    className={cn(
                      'w-7 h-7 rounded-lg text-[10px] font-mono flex items-center justify-center transition-all cursor-pointer border border-slate-800',
                      (tool === 'text' ? Math.max(12, size * 4) : size) === sz ? 'bg-blue-600 text-white font-bold border-blue-500' : 'hover:bg-slate-800 text-slate-400'
                    )}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* DESKTOP ACTIONS (Undo, Redo, Delete Selected, Clear, Export) */}
        <div className="hidden sm:flex items-center gap-1 pr-1.5 border-r border-slate-800 shrink-0">
          <button
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            onClick={onRedo}
            title="Redo (Ctrl+Y)"
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {(selectedId || selectedIds.length > 0) && onDeleteSelected && (
            <button
              onClick={onDeleteSelected}
              title="Delete Selected Objects (Delete)"
              className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors animate-pulse shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClear}
            title="Clear Whiteboard"
            className="p-2 rounded-xl hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={onExport}
            title="Export PNG Snapshot"
            className="p-2 rounded-xl hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* ✨ ASK AI BUTTON */}
        {(onAskAI || onAnalyzeAI) && (
          <button
            onClick={onAskAI || onAnalyzeAI}
            disabled={isAIAnalyzing}
            title="Ask AI about this whiteboard"
            className="p-2 sm:p-2 sm:px-3 rounded-2xl sm:rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-purple-400/30 shrink-0"
          >
            {isAIAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin text-purple-100" />
            ) : (
              <Sparkles className="w-4 h-4 text-purple-100 animate-pulse" />
            )}
            <span className="hidden sm:inline">{isAIAnalyzing ? 'Thinking...' : '✨ Ask AI'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

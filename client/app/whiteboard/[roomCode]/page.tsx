'use client';

import React, { useState, useEffect, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useWhiteboardState } from '../../../hooks/useWhiteboardState';
import { getApiBaseUrl } from '../../../lib/api';
import { useSocket } from '../../../hooks/useSocket';
import { Canvas } from '../../../components/whiteboard/Canvas';
import { Toolbar } from '../../../components/whiteboard/Toolbar';
import { RoomHeader } from '../../../components/whiteboard/RoomHeader';
import { ConfirmClearModal } from '../../../components/whiteboard/ConfirmClearModal';
import { ImageUploadModal } from '../../../components/whiteboard/ImageUploadModal';
import { PdfImportModal } from '../../../components/whiteboard/PdfImportModal';
import { SpeechProvider } from '../../../components/whiteboard/SpeechProvider';
import { AIAnalysisPanel } from '../../../components/whiteboard/AIAnalysisPanel';
import { AIGenerateModal } from '../../../components/whiteboard/AIGenerateModal';
import { LecturePanel } from '../../../components/whiteboard/LecturePanel';
import { LectureReplayBar } from '../../../components/whiteboard/LectureReplayBar';
import { useLectureMode } from '../../../hooks/useLectureMode';
import { DrawingTool, Point, StrokeData } from '../../../types/whiteboard';
import { WhiteboardAIResult, WhiteboardAIAction, AIGenerateWhiteboardResponse } from '../../../types/ai';

interface WhiteboardPageProps {
  params: Promise<{ roomCode: string }>;
}

export default function WhiteboardPage({ params }: WhiteboardPageProps) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.roomCode.toLowerCase();
  const router = useRouter();

  const [tool, setTool] = useState<DrawingTool>('brush');
  const [color, setColor] = useState('#3b82f6');
  const [fillColor, setFillColor] = useState('transparent');
  const [size, setSize] = useState(4);

  // Multi-Select State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Grid & Snap System State
  const [gridMode, setGridMode] = useState<'off' | 'dot' | 'line'>('dot');
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);

  // Image & PDF Upload Modals State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Canvas Theme State (Dark Black vs Light White)
  const [canvasTheme, setCanvasTheme] = useState<'dark' | 'light'>('dark');

  // AI Whiteboard Assistant & Generation States
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [aiResult, setAIResult] = useState<WhiteboardAIResult | null>(null);

  const [isAIGenerateModalOpen, setIsAIGenerateModalOpen] = useState(false);
  const [pendingAIGeneratedData, setPendingAIGeneratedData] = useState<AIGenerateWhiteboardResponse | null>(null);

  // 🎓 Live Lecture Intelligence State & Hook
  const [isLecturePanelOpen, setIsLecturePanelOpen] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem('whiteboard_username');
    if (storedName) {
      setUserName(storedName);
    }
    const storedTheme = localStorage.getItem('whiteboard_canvas_theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setCanvasTheme(storedTheme);
    }
  }, []);

  const handleToggleTheme = useCallback(() => {
    setCanvasTheme((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('whiteboard_canvas_theme', nextTheme);
      if (nextTheme === 'light' && color === '#ffffff') {
        setColor('#000000');
      } else if (nextTheme === 'dark' && color === '#000000') {
        setColor('#3b82f6');
      }
      return nextTheme;
    });
  }, [color]);

  const {
    strokes,
    setAllStrokes,
    addOrUpdateStroke,
    startLocalStroke,
    appendPointsToStroke,
    updateStrokeObject,
    deleteObjectById,
    restoreStrokeById,
    undoStrokeById,
    redoStroke,
    clearBoard,
  } = useWhiteboardState();

  const conversionMapRef = useRef<Map<string, { strokeIds: string[]; strokes: StrokeData[] }>>(new Map());

  const {
    isConnected,
    currentUser,
    users,
    isLocked,
    remoteCursors,
    remoteLasers,
    localLaser,
    emitRoomLock,
    emitUserRole,
    emitDrawingStart,
    emitDrawingUpdate,
    emitDrawingEnd,
    emitObjectMove,
    emitObjectUpdate,
    emitObjectDelete,
    emitBatchMove,
    emitBatchDelete,
    emitObjectGroup,
    emitObjectUngroup,
    emitCursorMove,
    emitLaserMove,
    emitUndo,
    emitRedo,
    emitClearBoard,
    emitTranscriptSegment,
  } = useSocket({
    roomCode,
    userName,
    onRoomJoined: (data) => {
      setAllStrokes(data.strokes);
    },
    onRemoteDrawingStart: (data) => {
      addOrUpdateStroke({
        id: data.strokeId,
        roomId: roomCode,
        userId: data.userId,
        userName: data.userName,
        tool: data.tool,
        color: data.color,
        size: data.size,
        fillColor: data.fillColor,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        rotation: data.rotation,
        childIds: data.childIds,
        assetUrl: data.assetUrl,
        isHighlighter: data.isHighlighter,
        text: data.text,
        fontSize: data.fontSize,
        fromId: data.fromId,
        toId: data.toId,
        points: data.point ? [data.point] : [],
      });
    },
    onRemoteDrawingUpdate: (data) => {
      appendPointsToStroke(data.strokeId, data.points || [], data);
    },
    onRemoteDrawingEnd: () => {},
    onRemoteObjectMove: (data) => {
      updateStrokeObject(data.strokeId, data);
    },
    onRemoteObjectUpdate: (data) => {
      updateStrokeObject(data.strokeId, data);
    },
    onRemoteObjectDelete: (data) => {
      deleteObjectById(data.strokeId);
    },
    onRemoteBatchMove: (data) => {
      data.moves.forEach((m) => {
        updateStrokeObject(m.strokeId, { x: m.x, y: m.y, rotation: m.rotation, points: m.points });
      });
    },
    onRemoteBatchDelete: (data) => {
      data.strokeIds.forEach((id) => deleteObjectById(id));
    },
    onRemoteObjectGroup: (data) => {
      addOrUpdateStroke(data.stroke);
    },
    onRemoteObjectUngroup: (data) => {
      deleteObjectById(data.groupId);
    },
    onStrokeUndo: (data) => {
      undoStrokeById(data.strokeId);
    },
    onStrokeRedo: (data) => {
      redoStroke(data.stroke);
    },
    onBoardClear: () => {
      clearBoard();
    },
    onError: (data) => {
      setErrorMessage(data.message);
      setTimeout(() => setErrorMessage(null), 4000);
    },
  });

  // 🎓 Lecture Mode Hook with Multi-User Attribution
  const lecture = useLectureMode({
    roomCode,
    strokes,
    currentUser,
  });

  // Local Canvas event handlers
  const handleStrokeStart = useCallback(
    (strokeId: string, toolType: DrawingTool, strokeColor: string, strokeSize: number, initialPoint: Point, extraData?: Partial<StrokeData>) => {
      startLocalStroke(strokeId, toolType, strokeColor, strokeSize, initialPoint, extraData);
      emitDrawingStart({
        strokeId,
        tool: toolType,
        color: strokeColor,
        size: strokeSize,
        point: initialPoint,
        ...extraData,
      });
    },
    [startLocalStroke, emitDrawingStart]
  );

  const handleStrokeUpdate = useCallback(
    (strokeId: string, points: Point[], extraData?: Partial<StrokeData>) => {
      appendPointsToStroke(strokeId, points, extraData);
      emitDrawingUpdate({
        strokeId,
        points,
        ...extraData,
      });
    },
    [appendPointsToStroke, emitDrawingUpdate]
  );

  const handleStrokeEnd = useCallback(
    (strokeId: string) => {
      emitDrawingEnd(strokeId);
    },
    [emitDrawingEnd]
  );

  const handleObjectMove = useCallback(
    (strokeId: string, x?: number, y?: number, rotation?: number, points?: Point[]) => {
      updateStrokeObject(strokeId, { x, y, rotation, points });
      emitObjectMove({ strokeId, x, y, rotation, points });
    },
    [updateStrokeObject, emitObjectMove]
  );

  const handleBatchMove = useCallback(
    (moves: Array<{ strokeId: string; x?: number; y?: number; rotation?: number; points?: Point[] }>) => {
      moves.forEach((m) => {
        updateStrokeObject(m.strokeId, { x: m.x, y: m.y, rotation: m.rotation, points: m.points });
      });
      emitBatchMove(moves);
    },
    [updateStrokeObject, emitBatchMove]
  );

  const handleObjectUpdate = useCallback(
    (strokeId: string, updates: Partial<StrokeData>) => {
      updateStrokeObject(strokeId, updates);
      emitObjectUpdate({ strokeId, ...updates });
    },
    [updateStrokeObject, emitObjectUpdate]
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;

    if (selectedIds.length === 1) {
      deleteObjectById(selectedIds[0]);
      emitObjectDelete(selectedIds[0]);
    } else {
      selectedIds.forEach((id) => deleteObjectById(id));
      emitBatchDelete(selectedIds);
    }
    setSelectedIds([]);
  }, [selectedIds, deleteObjectById, emitObjectDelete, emitBatchDelete]);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;

    const newIds: string[] = [];
    const selectedStrokes = strokes.filter((s) => selectedIds.includes(s.id) && !s.isDeleted);

    selectedStrokes.forEach((orig) => {
      const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const offsetPos = 0.03;
      const duplicated: StrokeData = {
        ...orig,
        id: newId,
        x: orig.x !== undefined ? orig.x + offsetPos : undefined,
        y: orig.y !== undefined ? orig.y + offsetPos : undefined,
        points: orig.points ? orig.points.map((p) => ({ x: p.x + offsetPos, y: p.y + offsetPos })) : [],
      };

      addOrUpdateStroke(duplicated);
      emitDrawingStart({
        strokeId: newId,
        tool: duplicated.tool,
        color: duplicated.color,
        size: duplicated.size,
        point: duplicated.points[0] || { x: duplicated.x || 0.1, y: duplicated.y || 0.1 },
        fillColor: duplicated.fillColor,
        x: duplicated.x,
        y: duplicated.y,
        width: duplicated.width,
        height: duplicated.height,
        rotation: duplicated.rotation,
        childIds: duplicated.childIds,
        assetUrl: duplicated.assetUrl,
        isHighlighter: duplicated.isHighlighter,
        text: duplicated.text,
        fontSize: duplicated.fontSize,
      });

      newIds.push(newId);
    });

    setSelectedIds(newIds);
  }, [selectedIds, strokes, addOrUpdateStroke, emitDrawingStart]);

  // Group Objects Action
  const handleGroupSelected = useCallback(() => {
    if (selectedIds.length < 2) return;

    const groupId = `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const selectedStrokes = strokes.filter((s) => selectedIds.includes(s.id) && !s.isDeleted);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    selectedStrokes.forEach((s) => {
      const sx = s.x || 0.1;
      const sy = s.y || 0.1;
      const sw = s.width || 0.1;
      const sh = s.height || 0.1;
      if (sx < minX) minX = sx;
      if (sy < minY) minY = sy;
      if (sx + sw > maxX) maxX = sx + sw;
      if (sy + sh > maxY) maxY = sy + sh;
    });

    const w = Math.max(0.05, maxX - minX);
    const h = Math.max(0.05, maxY - minY);

    const groupStroke: StrokeData = {
      id: groupId,
      roomId: roomCode,
      userId: currentUser?.id,
      userName: currentUser?.name,
      tool: 'group',
      color: '#3b82f6',
      size: 2,
      childIds: selectedIds,
      x: minX,
      y: minY,
      width: w,
      height: h,
      rotation: 0,
      points: [{ x: minX, y: minY }],
    };

    addOrUpdateStroke(groupStroke);
    emitObjectGroup(groupId, selectedIds, minX, minY, w, h);
    setSelectedIds([groupId]);
  }, [selectedIds, strokes, roomCode, currentUser, addOrUpdateStroke, emitObjectGroup]);

  // Ungroup Objects Action
  const handleUngroupSelected = useCallback(() => {
    if (selectedIds.length !== 1) return;
    const target = strokes.find((s) => s.id === selectedIds[0]);

    if (target && target.tool === 'group' && target.childIds) {
      deleteObjectById(target.id);
      emitObjectUngroup(target.id);
      setSelectedIds(target.childIds);
    }
  }, [selectedIds, strokes, deleteObjectById, emitObjectUngroup]);

  // Handle Image Asset Insertion onto Canvas
  const handleUploadImage = useCallback(
    (assetUrl: string, naturalW: number, naturalH: number) => {
      const strokeId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const normW = Math.min(0.5, Math.max(0.15, naturalW / 1200));
      const normH = Math.min(0.5, Math.max(0.15, naturalH / 1200));

      const strokeData: StrokeData = {
        id: strokeId,
        roomId: roomCode,
        userId: currentUser?.id,
        userName: currentUser?.name,
        tool: 'image',
        color: '#000000',
        size: 1,
        assetUrl,
        x: 0.25,
        y: 0.25,
        width: normW,
        height: normH,
        rotation: 0,
        points: [{ x: 0.25, y: 0.25 }],
      };

      addOrUpdateStroke(strokeData);
      emitDrawingStart({
        strokeId,
        tool: 'image',
        color: '#000000',
        size: 1,
        point: { x: 0.25, y: 0.25 },
        assetUrl,
        x: 0.25,
        y: 0.25,
        width: normW,
        height: normH,
        rotation: 0,
      });

      setSelectedIds([strokeId]);
      setTool('select');
    },
    [roomCode, currentUser, addOrUpdateStroke, emitDrawingStart]
  );

  // Handle PDF Pages Import onto Canvas in a clean grid flow
  const handleImportPdfPages = useCallback(
    (pages: Array<{ assetUrl: string; pageNumber: number; width: number; height: number }>) => {
      const batchIds: string[] = [];

      pages.forEach((page, idx) => {
        const strokeId = `pdf-${Date.now()}-${idx + 1}-${Math.random().toString(36).substring(2, 7)}`;
        const gridCol = idx % 3;
        const gridRow = Math.floor(idx / 3);

        const normX = 0.1 + gridCol * 0.28;
        const normY = 0.1 + gridRow * 0.35;
        const normW = 0.25;
        const normH = Math.min(0.4, (page.height / page.width) * normW);

        const strokeData: StrokeData = {
          id: strokeId,
          roomId: roomCode,
          userId: currentUser?.id,
          userName: currentUser?.name,
          tool: 'pdf_page',
          color: '#000000',
          size: 1,
          assetUrl: page.assetUrl,
          x: normX,
          y: normY,
          width: normW,
          height: normH,
          rotation: 0,
          points: [{ x: normX, y: normY }],
        };

        addOrUpdateStroke(strokeData);
        emitDrawingStart({
          strokeId,
          tool: 'pdf_page',
          color: '#000000',
          size: 1,
          point: { x: normX, y: normY },
          assetUrl: page.assetUrl,
          x: normX,
          y: normY,
          width: normW,
          height: normH,
          rotation: 0,
        });

        batchIds.push(strokeId);
      });

      setSelectedIds(batchIds);
      setTool('select');
    },
    [roomCode, currentUser, addOrUpdateStroke, emitDrawingStart]
  );

  const handleUndo = useCallback(() => {
    emitUndo();
  }, [emitUndo]);

  const handleRedo = useCallback(() => {
    emitRedo();
  }, [emitRedo]);

  const handleConfirmClear = useCallback(() => {
    emitClearBoard();
    setSelectedIds([]);
  }, [emitClearBoard]);

  const handleExportPNG = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = `whiteboard-${roomCode}-${Date.now()}.png`;
    link.click();
  }, [roomCode]);

  // General-Purpose AI Whiteboard Assistant & Generation Handler
  const handleAskAI = useCallback(
    async (action: WhiteboardAIAction = 'analyze', customQuestion?: string) => {
      setIsAIPanelOpen(true);
      setAIError(null);

      const activeStrokes = strokes.filter((s) => !s.isDeleted);
      if (action !== 'generate_whiteboard' && activeStrokes.length === 0) {
        setAIResult(null);
        setAIError('No content to analyze yet. Draw or add shapes to the whiteboard and try again.');
        return;
      }

      setIsAIAnalyzing(true);

      try {
        const canvas = document.querySelector('canvas');
        const image = canvas ? canvas.toDataURL('image/png') : undefined;

        const objectsPayload = activeStrokes.map((s) => ({
          id: s.id,
          type: s.tool,
          x: s.x,
          y: s.y,
          width: s.width,
          height: s.height,
          rotation: s.rotation,
          color: s.color,
          fillColor: s.fillColor,
          text: s.text,
          fromId: s.fromId,
          toId: s.toId,
        }));

        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/ai/whiteboard`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomCode,
            action,
            question: customQuestion || null,
            strokes: activeStrokes,
            objects: objectsPayload,
            image,
          }),
        });

        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(json.error || 'AI Whiteboard Assistant request failed.');
        }

        setAIResult(json.data);

        if (action === 'generate_whiteboard' && json.data?.generatedContent) {
          setPendingAIGeneratedData(json.data.generatedContent);
          setIsAIGenerateModalOpen(true);
        }
      } catch (err: any) {
        setAIResult(null);
        setAIError(err.message || 'Unable to process whiteboard AI request right now. Please try again.');
      } finally {
        setIsAIAnalyzing(false);
      }
    },
    [roomCode, strokes]
  );

  // Batch insert AI generated objects on board confirmation
  const handleConfirmAIGeneration = useCallback(() => {
    if (!pendingAIGeneratedData || !pendingAIGeneratedData.objects) return;

    const objects = pendingAIGeneratedData.objects;
    const batchTimestamp = Date.now();

    objects.forEach((obj, idx) => {
      const strokeId = obj.id || `ai-${batchTimestamp}-${idx + 1}`;
      const toolType = (obj.type || 'rectangle') as DrawingTool;
      const strokeColor = obj.color || obj.strokeColor || '#3b82f6';
      const strokeFillColor = obj.fillColor || (obj.type === 'sticky' ? '#fef08a' : 'transparent');
      const strokeSize = obj.size || obj.strokeWidth || 2;
      const fontSize = obj.fontSize || 14;

      const firstPoint = obj.points?.[0] || { x: obj.x ?? 0.1, y: obj.y ?? 0.1 };

      const strokeData: StrokeData = {
        id: strokeId,
        roomId: roomCode,
        userId: currentUser?.id || 'ai-agent',
        userName: currentUser?.name || 'AI Assistant',
        tool: toolType,
        color: strokeColor,
        size: strokeSize,
        fillColor: strokeFillColor,
        x: obj.x ?? 0.1,
        y: obj.y ?? 0.1,
        width: obj.width ?? 0.15,
        height: obj.height ?? 0.08,
        text: obj.text,
        fontSize,
        fromId: obj.fromId,
        toId: obj.toId,
        points: obj.points || [],
      };

      addOrUpdateStroke(strokeData);

      emitDrawingStart({
        strokeId,
        tool: toolType,
        color: strokeColor,
        size: strokeSize,
        point: firstPoint,
        fillColor: strokeFillColor,
        x: strokeData.x,
        y: strokeData.y,
        width: strokeData.width,
        height: strokeData.height,
        text: strokeData.text,
        fontSize: strokeData.fontSize,
        fromId: strokeData.fromId,
        toId: strokeData.toId,
        points: strokeData.points,
      });
    });

    setIsAIGenerateModalOpen(false);
    setPendingAIGeneratedData(null);
  }, [pendingAIGeneratedData, roomCode, currentUser, addOrUpdateStroke, emitDrawingStart]);

  return (
    <main suppressHydrationWarning className={`relative w-screen h-screen overflow-hidden transition-colors duration-300 ${canvasTheme === 'light' ? 'bg-slate-50' : 'bg-slate-950'}`}>
      {/* Toast Error Alert */}
      {errorMessage && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-red-600/90 text-white px-4 py-2 rounded-xl shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Header Bar */}
      <RoomHeader
        roomCode={roomCode}
        isConnected={isConnected}
        users={users}
        currentUser={currentUser}
        canvasTheme={canvasTheme}
        onToggleTheme={handleToggleTheme}
        isLectureRecording={lecture.isRecording}
        lectureElapsedSeconds={lecture.elapsedSeconds}
        onStartLecture={lecture.startLecture}
        onEndLecture={lecture.endLecture}
        onOpenLecturePanel={() => setIsLecturePanelOpen(true)}
      />

      {/* Speech Provider Voice Transcription Floating Control */}
      <div className="fixed top-16 right-4 z-40 max-w-sm w-full">
        <SpeechProvider
          lectureSessionId={lecture.sessionId}
          isLectureActive={lecture.isRecording}
          onEmitTranscriptSegment={emitTranscriptSegment}
        />
      </div>

      {/* Main Canvas Workspace */}
      <Canvas
        tool={tool}
        color={color}
        fillColor={fillColor}
        size={size}
        strokes={lecture.replayState.previewBoardState || strokes}
        selectedIds={selectedIds}
        gridMode={gridMode}
        snapToGrid={snapToGrid}
        canvasTheme={canvasTheme}
        remoteCursors={remoteCursors}
        remoteLasers={remoteLasers}
        localLaser={localLaser}
        onSelectObjects={setSelectedIds}
        onStrokeStart={handleStrokeStart}
        onStrokeUpdate={handleStrokeUpdate}
        onStrokeEnd={handleStrokeEnd}
        onObjectMove={handleObjectMove}
        onBatchMove={handleBatchMove}
        onObjectUpdate={handleObjectUpdate}
        onGroupSelected={handleGroupSelected}
        onUngroupSelected={handleUngroupSelected}
        onDeleteSelected={handleDeleteSelected}
        onDuplicateSelected={handleDuplicateSelected}
        onCursorMove={emitCursorMove}
        onLaserMove={emitLaserMove}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Floating Toolbar */}
      <Toolbar
        tool={tool}
        color={color}
        fillColor={fillColor}
        size={size}
        isAIAnalyzing={isAIAnalyzing}
        selectedIds={selectedIds}
        gridMode={gridMode}
        snapToGrid={snapToGrid}
        isLocked={isLocked}
        userRole={currentUser?.role}
        onToolChange={(t) => {
          setTool(t);
          if (t !== 'select') setSelectedIds([]);
        }}
        onColorChange={setColor}
        onFillColorChange={setFillColor}
        onSizeChange={setSize}
        onGridModeChange={setGridMode}
        onToggleSnapToGrid={() => setSnapToGrid((prev) => !prev)}
        onToggleLock={() => emitRoomLock(!isLocked)}
        onOpenImageModal={() => setIsImageModalOpen(true)}
        onOpenPdfModal={() => setIsPdfModalOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={() => setIsClearModalOpen(true)}
        onExport={handleExportPNG}
        onDeleteSelected={handleDeleteSelected}
        onAskAI={() => handleAskAI('analyze')}
        onAnalyzeAI={() => handleAskAI('analyze')}
      />

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onUploadImage={handleUploadImage}
      />

      {/* PDF Import Modal */}
      <PdfImportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        onImportPdfPages={handleImportPdfPages}
      />

      {/* 🎓 Live Lecture Intelligence Side Panel */}
      <LecturePanel
        isOpen={isLecturePanelOpen}
        onClose={() => setIsLecturePanelOpen(false)}
        isRecording={lecture.isRecording}
        elapsedSeconds={lecture.elapsedSeconds}
        startedAt={lecture.startedAt}
        endedAt={lecture.endedAt}
        events={lecture.events}
        snapshots={lecture.snapshots}
        isLoading={lecture.isLoading}
        activeAction={lecture.activeAction}
        error={lecture.error}
        notesResult={lecture.notesResult}
        quizResult={lecture.quizResult}
        flashcardsResult={lecture.flashcardsResult}
        qaResult={lecture.qaResult}
        roomCode={roomCode}
        onStartLecture={lecture.startLecture}
        onEndLecture={lecture.endLecture}
        onCallAI={lecture.callLectureAI}
        onStartReplay={lecture.startReplay}
        onSeekReplay={lecture.seekReplay}
      />

      {/* ▶️ Lecture Replay Control Bar */}
      {(lecture.replayState.isPlaying || lecture.replayState.previewBoardState) && (
        <LectureReplayBar
          replayState={lecture.replayState}
          snapshots={lecture.snapshots}
          onPlay={lecture.startReplay}
          onPause={lecture.pauseReplay}
          onSeek={lecture.seekReplay}
          onStop={lecture.stopReplay}
          onSpeedChange={(spd) => {
            lecture.seekReplay(lecture.replayState.currentTimeOffsetSeconds);
          }}
        />
      )}

      {/* ✨ Whiteboard AI Assistant Side Panel */}
      <AIAnalysisPanel
        isOpen={isAIPanelOpen}
        isLoading={isAIAnalyzing}
        error={aiError}
        result={aiResult}
        onClose={() => setIsAIPanelOpen(false)}
        onActionSelect={(action, question) => handleAskAI(action, question)}
        onReAnalyze={() => handleAskAI('analyze')}
      />

      {/* ✨ AI Generated Whiteboard Preview Modal */}
      <AIGenerateModal
        isOpen={isAIGenerateModalOpen}
        generatedData={pendingAIGeneratedData}
        onConfirm={handleConfirmAIGeneration}
        onCancel={() => {
          setIsAIGenerateModalOpen(false);
          setPendingAIGeneratedData(null);
        }}
      />

      {/* Confirm Clear Modal */}
      <ConfirmClearModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClear}
      />
    </main>
  );
}

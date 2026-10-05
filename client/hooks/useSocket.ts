import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '../lib/socket';
import { UserPresence, UserRole, CursorPosition, LaserPosition, StrokeData, Point, DrawingTool } from '../types/whiteboard';

interface UseSocketOptions {
  roomCode: string;
  userName?: string;
  authToken?: string | null;
  onRoomJoined?: (data: { roomCode: string; currentUser: UserPresence; users: UserPresence[]; strokes: StrokeData[]; isLocked: boolean }) => void;
  onUserJoin?: (user: UserPresence) => void;
  onUserLeave?: (payload: { userId: string; socketId: string }) => void;
  onUsersUpdate?: (users: UserPresence[]) => void;
  onRoomLockUpdated?: (data: { isLocked: boolean; updatedBy: string }) => void;
  onUserRoleUpdated?: (data: { userId: string; role: UserRole; updatedBy: string }) => void;
  onRemoteDrawingStart?: (data: Partial<StrokeData> & { strokeId: string; userId: string; userName: string; tool: DrawingTool; color: string; size: number; point: Point }) => void;
  onRemoteDrawingUpdate?: (data: Partial<StrokeData> & { strokeId: string; points: Point[] }) => void;
  onRemoteDrawingEnd?: (data: { strokeId: string }) => void;
  onRemoteObjectMove?: (data: { strokeId: string; x?: number; y?: number; rotation?: number; points?: Point[] }) => void;
  onRemoteObjectUpdate?: (data: { strokeId: string; text?: string; fillColor?: string; color?: string; width?: number; height?: number; rotation?: number }) => void;
  onRemoteObjectDelete?: (data: { strokeId: string }) => void;
  onRemoteBatchMove?: (data: { moves: Array<{ strokeId: string; x?: number; y?: number; rotation?: number; points?: Point[] }> }) => void;
  onRemoteBatchDelete?: (data: { strokeIds: string[] }) => void;
  onRemoteObjectGroup?: (data: { stroke: StrokeData }) => void;
  onRemoteObjectUngroup?: (data: { groupId: string }) => void;
  onStrokeUndo?: (data: { strokeId: string; undoneBy: string }) => void;
  onStrokeRedo?: (data: { stroke: StrokeData; redoneBy: string }) => void;
  onBoardClear?: (data: { clearedBy: string }) => void;
  onError?: (data: { message: string }) => void;
}

export function useSocket({
  roomCode,
  userName,
  authToken,
  onRoomJoined,
  onUserJoin,
  onUserLeave,
  onUsersUpdate,
  onRoomLockUpdated,
  onUserRoleUpdated,
  onRemoteDrawingStart,
  onRemoteDrawingUpdate,
  onRemoteDrawingEnd,
  onRemoteObjectMove,
  onRemoteObjectUpdate,
  onRemoteObjectDelete,
  onRemoteBatchMove,
  onRemoteBatchDelete,
  onRemoteObjectGroup,
  onRemoteObjectUngroup,
  onStrokeUndo,
  onStrokeRedo,
  onBoardClear,
  onError,
}: UseSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserPresence | null>(null);
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [remoteLasers, setRemoteLasers] = useState<Map<string, LaserPosition>>(new Map());
  const [localLaser, setLocalLaser] = useState<LaserPosition | null>(null);

  const callbacksRef = useRef({
    onRoomJoined,
    onUserJoin,
    onUserLeave,
    onUsersUpdate,
    onRoomLockUpdated,
    onUserRoleUpdated,
    onRemoteDrawingStart,
    onRemoteDrawingUpdate,
    onRemoteDrawingEnd,
    onRemoteObjectMove,
    onRemoteObjectUpdate,
    onRemoteObjectDelete,
    onRemoteBatchMove,
    onRemoteBatchDelete,
    onRemoteObjectGroup,
    onRemoteObjectUngroup,
    onStrokeUndo,
    onStrokeRedo,
    onBoardClear,
    onError,
  });

  useEffect(() => {
    callbacksRef.current = {
      onRoomJoined,
      onUserJoin,
      onUserLeave,
      onUsersUpdate,
      onRoomLockUpdated,
      onUserRoleUpdated,
      onRemoteDrawingStart,
      onRemoteDrawingUpdate,
      onRemoteDrawingEnd,
      onRemoteObjectMove,
      onRemoteObjectUpdate,
      onRemoteObjectDelete,
      onRemoteBatchMove,
      onRemoteBatchDelete,
      onRemoteObjectGroup,
      onRemoteObjectUngroup,
      onStrokeUndo,
      onStrokeRedo,
      onBoardClear,
      onError,
    };
  });

  const socketRef = useRef(getSocket(authToken));

  useEffect(() => {
    const socket = socketRef.current;

    if (!socket.connected) {
      socket.connect();
    }

    function onConnect() {
      setIsConnected(true);
      socket.emit('room:join', { roomCode, userName });
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socket.on('room:joined', (data) => {
      setCurrentUser(data.currentUser);
      setUsers(data.users);
      setIsLocked(data.isLocked || false);
      if (callbacksRef.current.onRoomJoined) callbacksRef.current.onRoomJoined(data);
    });

    socket.on('user:join', (user) => {
      setUsers((prev) => [...prev.filter((u) => u.socketId !== user.socketId), user]);
      if (callbacksRef.current.onUserJoin) callbacksRef.current.onUserJoin(user);
    });

    socket.on('user:leave', (payload) => {
      setUsers((prev) => prev.filter((u) => u.socketId !== payload.socketId));
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(payload.userId);
        return next;
      });
      setRemoteLasers((prev) => {
        const next = new Map(prev);
        next.delete(payload.userId);
        return next;
      });
      if (callbacksRef.current.onUserLeave) callbacksRef.current.onUserLeave(payload);
    });

    socket.on('users:update', (updatedUsers) => {
      setUsers(updatedUsers);
      if (callbacksRef.current.onUsersUpdate) callbacksRef.current.onUsersUpdate(updatedUsers);
    });

    socket.on('room:lock_updated', (data) => {
      setIsLocked(data.isLocked);
      if (callbacksRef.current.onRoomLockUpdated) callbacksRef.current.onRoomLockUpdated(data);
    });

    socket.on('user:role_updated', (data) => {
      if (currentUser && currentUser.id === data.userId) {
        setCurrentUser((prev) => (prev ? { ...prev, role: data.role } : null));
      }
      if (callbacksRef.current.onUserRoleUpdated) callbacksRef.current.onUserRoleUpdated(data);
    });

    socket.on('drawing:start', (data) => {
      if (callbacksRef.current.onRemoteDrawingStart) callbacksRef.current.onRemoteDrawingStart(data);
    });

    socket.on('drawing:update', (data) => {
      if (callbacksRef.current.onRemoteDrawingUpdate) callbacksRef.current.onRemoteDrawingUpdate(data);
    });

    socket.on('drawing:end', (data) => {
      if (callbacksRef.current.onRemoteDrawingEnd) callbacksRef.current.onRemoteDrawingEnd(data);
    });

    socket.on('object:move', (data) => {
      if (callbacksRef.current.onRemoteObjectMove) callbacksRef.current.onRemoteObjectMove(data);
    });

    socket.on('object:update', (data) => {
      if (callbacksRef.current.onRemoteObjectUpdate) callbacksRef.current.onRemoteObjectUpdate(data);
    });

    socket.on('object:delete', (data) => {
      if (callbacksRef.current.onRemoteObjectDelete) callbacksRef.current.onRemoteObjectDelete(data);
    });

    socket.on('object:batch_move', (data) => {
      if (callbacksRef.current.onRemoteBatchMove) callbacksRef.current.onRemoteBatchMove(data);
    });

    socket.on('object:batch_delete', (data) => {
      if (callbacksRef.current.onRemoteBatchDelete) callbacksRef.current.onRemoteBatchDelete(data);
    });

    socket.on('object:group', (data) => {
      if (callbacksRef.current.onRemoteObjectGroup) callbacksRef.current.onRemoteObjectGroup(data);
    });

    socket.on('object:ungroup', (data) => {
      if (callbacksRef.current.onRemoteObjectUngroup) callbacksRef.current.onRemoteObjectUngroup(data);
    });

    socket.on('cursor:move', (cursor) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.set(cursor.userId, cursor);
        return next;
      });
    });

    socket.on('cursor:laser', (laser) => {
      setRemoteLasers((prev) => {
        const next = new Map(prev);
        next.set(laser.userId, laser);
        return next;
      });

      // Auto-cleanup remote laser after 1.2s inactivity
      setTimeout(() => {
        setRemoteLasers((prev) => {
          const l = prev.get(laser.userId);
          if (l && Date.now() - l.timestamp >= 1000) {
            const next = new Map(prev);
            next.delete(laser.userId);
            return next;
          }
          return prev;
        });
      }, 1200);
    });

    socket.on('stroke:undo', (data) => {
      if (callbacksRef.current.onStrokeUndo) callbacksRef.current.onStrokeUndo(data);
    });

    socket.on('stroke:redo', (data) => {
      if (callbacksRef.current.onStrokeRedo) callbacksRef.current.onStrokeRedo(data);
    });

    socket.on('board:clear', (data) => {
      if (callbacksRef.current.onBoardClear) callbacksRef.current.onBoardClear(data);
    });

    socket.on('error', (data) => {
      if (callbacksRef.current.onError) callbacksRef.current.onError(data);
    });

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:joined');
      socket.off('user:join');
      socket.off('user:leave');
      socket.off('users:update');
      socket.off('room:lock_updated');
      socket.off('user:role_updated');
      socket.off('drawing:start');
      socket.off('drawing:update');
      socket.off('drawing:end');
      socket.off('object:move');
      socket.off('object:update');
      socket.off('object:delete');
      socket.off('object:batch_move');
      socket.off('object:batch_delete');
      socket.off('object:group');
      socket.off('object:ungroup');
      socket.off('cursor:move');
      socket.off('cursor:laser');
      socket.off('stroke:undo');
      socket.off('stroke:redo');
      socket.off('board:clear');
      socket.off('error');
    };
  }, [roomCode, userName]);

  // Emitters
  const emitRoomLock = useCallback((lock: boolean) => {
    socketRef.current.emit('room:lock', { isLocked: lock });
  }, []);

  const emitUserRole = useCallback((targetUserId: string, role: UserRole) => {
    socketRef.current.emit('user:role', { targetUserId, role });
  }, []);

  const emitDrawingStart = useCallback((payload: Partial<StrokeData> & { strokeId: string; tool: DrawingTool; color: string; size: number; point: Point }) => {
    socketRef.current.emit('drawing:start', payload);
  }, []);

  const emitDrawingUpdate = useCallback((payload: Partial<StrokeData> & { strokeId: string; points: Point[] }) => {
    socketRef.current.emit('drawing:update', payload);
  }, []);

  const emitDrawingEnd = useCallback((strokeId: string) => {
    socketRef.current.emit('drawing:end', { strokeId });
  }, []);

  const emitObjectMove = useCallback((payload: { strokeId: string; x?: number; y?: number; rotation?: number; points?: Point[] }) => {
    socketRef.current.emit('object:move', payload);
  }, []);

  const emitObjectUpdate = useCallback((payload: { strokeId: string; text?: string; fillColor?: string; color?: string; size?: number; width?: number; height?: number; rotation?: number }) => {
    socketRef.current.emit('object:update', payload);
  }, []);

  const emitObjectDelete = useCallback((strokeId: string) => {
    socketRef.current.emit('object:delete', { strokeId });
  }, []);

  const emitBatchMove = useCallback((moves: Array<{ strokeId: string; x?: number; y?: number; rotation?: number; points?: Point[] }>) => {
    socketRef.current.emit('object:batch_move', { moves });
  }, []);

  const emitBatchDelete = useCallback((strokeIds: string[]) => {
    socketRef.current.emit('object:batch_delete', { strokeIds });
  }, []);

  const emitObjectGroup = useCallback((groupId: string, childIds: string[], x: number, y: number, width: number, height: number) => {
    socketRef.current.emit('object:group', { groupId, childIds, x, y, width, height });
  }, []);

  const emitObjectUngroup = useCallback((groupId: string) => {
    socketRef.current.emit('object:ungroup', { groupId });
  }, []);

  const emitCursorMove = useCallback((x: number, y: number) => {
    socketRef.current.emit('cursor:move', { x, y });
  }, []);

  const emitLaserMove = useCallback((x: number, y: number) => {
    setLocalLaser({
      userId: currentUser?.id || 'local',
      userName: currentUser?.name || 'You',
      color: '#ef4444',
      x,
      y,
      timestamp: Date.now(),
    });
    socketRef.current.emit('cursor:laser', { x, y });
  }, [currentUser]);

  const emitUndo = useCallback(() => {
    socketRef.current.emit('stroke:undo');
  }, []);

  const emitRedo = useCallback(() => {
    socketRef.current.emit('stroke:redo');
  }, []);

  const emitClearBoard = useCallback(() => {
    socketRef.current.emit('board:clear');
  }, []);

  const emitTranscriptSegment = useCallback((segment: { lectureSessionId: string; startTime: number; endTime: number; text: string; confidence?: number }) => {
    socketRef.current.emit('lecture:transcript_segment', segment);
  }, []);

  return {
    socket: socketRef.current,
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
  };
}

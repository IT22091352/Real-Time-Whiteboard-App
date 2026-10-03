import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { logActivity } from '../services/activityService.js';
import { loadRoomStrokes } from '../services/strokeService.js';

function generateRandomCode(): string {
  return Math.random().toString(36).substring(2, 8);
}

export async function createRoomHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, description, roomCode: customCode } = req.body || {};
    const roomCode = customCode && typeof customCode === 'string'
      ? customCode.trim().toLowerCase()
      : generateRandomCode();

    const roomName = name && name.trim() ? name.trim() : 'Untitled Whiteboard';

    // Create Room
    const room = await prisma.room.create({
      data: {
        roomCode,
        name: roomName,
        description: description ? description.trim() : undefined,
        ownerId: req.user ? req.user.id : undefined,
        hostUserId: req.user ? req.user.id : undefined,
      },
    });

    // If created by an authenticated user, add as HOST in RoomMember
    if (req.user) {
      await prisma.roomMember.create({
        data: {
          roomId: room.id,
          userId: req.user.id,
          role: 'HOST',
        },
      });

      await logActivity(
        req.user.id,
        'BOARD_CREATED',
        room.id,
        room.roomCode,
        room.name,
        `Created whiteboard "${room.name}"`
      );
    }

    res.status(201).json({
      success: true,
      roomCode: room.roomCode,
      roomId: room.id,
      name: room.name,
    });
  } catch (error) {
    console.error('[RoomController] Error creating room:', error);
    res.status(500).json({ success: false, error: 'Failed to create room' });
  }
}

export async function getRoomDetailsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const roomCode = req.params.roomCode.toLowerCase();
    
    let room = await prisma.room.findUnique({
      where: { roomCode },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!room) {
      // Auto-create guest room if not found
      room = await prisma.room.create({
        data: {
          roomCode,
          name: `Whiteboard ${roomCode.toUpperCase()}`,
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
        },
      });
    }

    // Determine user role
    let userRole = 'EDITOR';
    if (req.user) {
      const membership = room.members.find((m) => m.userId === req.user!.id);
      if (membership) {
        userRole = membership.role;
      } else if (room.ownerId === req.user.id) {
        userRole = 'HOST';
        // Auto-add member as HOST if owner
        await prisma.roomMember.create({
          data: { roomId: room.id, userId: req.user.id, role: 'HOST' },
        }).catch(() => {});
      } else {
        // Auto-add authenticated user as EDITOR member
        await prisma.roomMember.create({
          data: { roomId: room.id, userId: req.user.id, role: 'EDITOR' },
        }).catch(() => {});
      }
    }

    const strokes = await loadRoomStrokes(room.id, roomCode);

    res.json({
      success: true,
      roomId: room.id,
      roomCode: room.roomCode,
      name: room.name,
      description: room.description,
      owner: room.owner,
      isLocked: room.isLocked,
      userRole,
      strokeCount: strokes.length,
      members: room.members,
      createdAt: room.createdAt,
    });
  } catch (error) {
    console.error('[RoomController] Error fetching room details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch room details' });
  }
}

export async function renameRoomHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  const { roomCode } = req.params;
  const { name, description } = req.body;

  try {
    const room = await prisma.room.findUnique({
      where: { roomCode: roomCode.toLowerCase() },
      include: { members: true },
    });

    if (!room) {
      res.status(404).json({ message: 'Whiteboard not found.' });
      return;
    }

    const isOwner = room.ownerId === req.user.id;
    const isHost = room.members.some((m) => m.userId === req.user!.id && m.role === 'HOST');

    if (!isOwner && !isHost) {
      res.status(403).json({ message: 'Only the board owner or Host can rename this whiteboard.' });
      return;
    }

    const updated = await prisma.room.update({
      where: { id: room.id },
      data: {
        name: name && name.trim() ? name.trim() : room.name,
        description: description !== undefined ? description.trim() : room.description,
      },
    });

    await logActivity(
      req.user.id,
      'BOARD_RENAMED',
      room.id,
      room.roomCode,
      updated.name,
      `Renamed whiteboard to "${updated.name}"`
    );

    res.json({ success: true, room: updated });
  } catch (error) {
    console.error('[RoomController] Rename error:', error);
    res.status(500).json({ message: 'Failed to rename whiteboard.' });
  }
}

export async function duplicateRoomHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  const { roomCode } = req.params;

  try {
    const originalRoom = await prisma.room.findUnique({
      where: { roomCode: roomCode.toLowerCase() },
      include: { strokes: { where: { isDeleted: false } } },
    });

    if (!originalRoom) {
      res.status(404).json({ message: 'Whiteboard not found.' });
      return;
    }

    const newCode = generateRandomCode();
    const newName = `${originalRoom.name} (Copy)`;

    const newRoom = await prisma.room.create({
      data: {
        roomCode: newCode,
        name: newName,
        description: originalRoom.description,
        ownerId: req.user.id,
        hostUserId: req.user.id,
      },
    });

    await prisma.roomMember.create({
      data: {
        roomId: newRoom.id,
        userId: req.user.id,
        role: 'HOST',
      },
    });

    // Clone strokes
    if (originalRoom.strokes.length > 0) {
      const strokeDataToCreate = originalRoom.strokes.map((s) => ({
        roomId: newRoom.id,
        userId: req.user!.id,
        tool: s.tool,
        color: s.color,
        size: s.size,
        fillColor: s.fillColor,
        text: s.text,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        fontSize: s.fontSize,
        rotation: s.rotation,
        childIds: s.childIds,
        assetUrl: s.assetUrl,
        isHighlighter: s.isHighlighter,
        fromId: s.fromId,
        toId: s.toId,
        points: s.points,
        isDeleted: false,
      }));

      await prisma.stroke.createMany({
        data: strokeDataToCreate,
      });
    }

    await logActivity(
      req.user.id,
      'BOARD_DUPLICATED',
      newRoom.id,
      newRoom.roomCode,
      newRoom.name,
      `Duplicated board from "${originalRoom.name}"`
    );

    res.status(201).json({
      success: true,
      roomCode: newRoom.roomCode,
      roomId: newRoom.id,
      name: newRoom.name,
    });
  } catch (error) {
    console.error('[RoomController] Duplicate error:', error);
    res.status(500).json({ message: 'Failed to duplicate whiteboard.' });
  }
}

export async function deleteRoomHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  const { roomCode } = req.params;

  try {
    const room = await prisma.room.findUnique({
      where: { roomCode: roomCode.toLowerCase() },
    });

    if (!room) {
      res.status(404).json({ message: 'Whiteboard not found.' });
      return;
    }

    if (room.ownerId !== req.user.id) {
      res.status(403).json({ message: 'Only the board owner can delete this whiteboard.' });
      return;
    }

    await prisma.room.delete({
      where: { id: room.id },
    });

    await logActivity(
      req.user.id,
      'BOARD_DELETED',
      room.id,
      room.roomCode,
      room.name,
      `Deleted whiteboard "${room.name}"`
    );

    res.json({ success: true, message: 'Whiteboard deleted successfully.' });
  } catch (error) {
    console.error('[RoomController] Delete error:', error);
    res.status(500).json({ message: 'Failed to delete whiteboard.' });
  }
}

export async function shareRoomHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  const { roomCode } = req.params;
  const { targetEmail, role } = req.body;

  try {
    const room = await prisma.room.findUnique({
      where: { roomCode: roomCode.toLowerCase() },
      include: { members: true },
    });

    if (!room) {
      res.status(404).json({ message: 'Whiteboard not found.' });
      return;
    }

    const isOwner = room.ownerId === req.user.id;
    const isHost = room.members.some((m) => m.userId === req.user!.id && m.role === 'HOST');

    if (!isOwner && !isHost) {
      res.status(403).json({ message: 'Only the owner or Host can manage access permissions.' });
      return;
    }

    if (targetEmail) {
      const targetUser = await prisma.user.findUnique({
        where: { email: targetEmail.trim().toLowerCase() },
      });

      if (!targetUser) {
        res.status(404).json({ message: 'User with specified email address not found.' });
        return;
      }

      const assignedRole = role === 'HOST' || role === 'VIEWER' ? role : 'EDITOR';

      await prisma.roomMember.upsert({
        where: {
          roomId_userId: {
            roomId: room.id,
            userId: targetUser.id,
          },
        },
        create: {
          roomId: room.id,
          userId: targetUser.id,
          role: assignedRole,
        },
        update: {
          role: assignedRole,
        },
      });

      await logActivity(
        req.user.id,
        'BOARD_SHARED',
        room.id,
        room.roomCode,
        room.name,
        `Shared board with ${targetUser.email} as ${assignedRole}`
      );
    }

    const updatedMembers = await prisma.roomMember.findMany({
      where: { roomId: room.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    res.json({
      success: true,
      members: updatedMembers,
      shareUrl: `${req.protocol}://${req.get('host')}/whiteboard/${room.roomCode}`,
    });
  } catch (error) {
    console.error('[RoomController] Share error:', error);
    res.status(500).json({ message: 'Failed to update access permissions.' });
  }
}

export async function getRevisionsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { roomCode } = req.params;

  try {
    const room = await prisma.room.findUnique({
      where: { roomCode: roomCode.toLowerCase() },
    });

    if (!room) {
      res.status(404).json({ message: 'Whiteboard not found.' });
      return;
    }

    const revisions = await prisma.boardRevision.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    res.json({ success: true, revisions });
  } catch (error) {
    console.error('[RoomController] Get revisions error:', error);
    res.status(500).json({ message: 'Failed to fetch revisions.' });
  }
}

export async function createRevisionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  const { roomCode } = req.params;
  const { label } = req.body;

  try {
    const room = await prisma.room.findUnique({
      where: { roomCode: roomCode.toLowerCase() },
    });

    if (!room) {
      res.status(404).json({ message: 'Whiteboard not found.' });
      return;
    }

    const currentStrokes = await loadRoomStrokes(room.id, room.roomCode);

    const revision = await prisma.boardRevision.create({
      data: {
        roomId: room.id,
        label: label && label.trim() ? label.trim() : `Checkpoint ${new Date().toLocaleTimeString()}`,
        boardState: JSON.stringify(currentStrokes),
        createdBy: req.user.id,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    await logActivity(
      req.user.id,
      'REVISION_CREATED',
      room.id,
      room.roomCode,
      room.name,
      `Saved checkpoint "${revision.label}"`
    );

    res.status(201).json({ success: true, revision });
  } catch (error) {
    console.error('[RoomController] Create revision error:', error);
    res.status(500).json({ message: 'Failed to save revision checkpoint.' });
  }
}

export async function restoreRevisionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  const { roomCode, revisionId } = req.params;

  try {
    const room = await prisma.room.findUnique({
      where: { roomCode: roomCode.toLowerCase() },
    });

    if (!room) {
      res.status(404).json({ message: 'Whiteboard not found.' });
      return;
    }

    const revision = await prisma.boardRevision.findUnique({
      where: { id: revisionId },
    });

    if (!revision || revision.roomId !== room.id) {
      res.status(404).json({ message: 'Revision checkpoint not found.' });
      return;
    }

    const restoredStrokes: any[] = JSON.parse(revision.boardState || '[]');

    // Soft delete existing strokes
    await prisma.stroke.updateMany({
      where: { roomId: room.id, isDeleted: false },
      data: { isDeleted: true },
    });

    // Re-create strokes from restored revision state
    if (restoredStrokes.length > 0) {
      const newStrokePayloads = restoredStrokes.map((s) => ({
        roomId: room.id,
        userId: req.user!.id,
        tool: s.tool || 'brush',
        color: s.color || '#000000',
        size: s.size || 4,
        fillColor: s.fillColor,
        text: s.text,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        fontSize: s.fontSize,
        rotation: s.rotation || 0,
        childIds: s.childIds ? JSON.stringify(s.childIds) : undefined,
        assetUrl: s.assetUrl,
        isHighlighter: s.isHighlighter || false,
        fromId: s.fromId,
        toId: s.toId,
        points: typeof s.points === 'string' ? s.points : JSON.stringify(s.points || []),
        isDeleted: false,
      }));

      await prisma.stroke.createMany({
        data: newStrokePayloads,
      });
    }

    // Create a new safety revision snapshot from restored state
    await prisma.boardRevision.create({
      data: {
        roomId: room.id,
        label: `Restored from "${revision.label}"`,
        boardState: revision.boardState,
        createdBy: req.user.id,
      },
    });

    await logActivity(
      req.user.id,
      'REVISION_RESTORED',
      room.id,
      room.roomCode,
      room.name,
      `Restored checkpoint "${revision.label}"`
    );

    res.json({
      success: true,
      message: `Successfully restored board to checkpoint "${revision.label}".`,
    });
  } catch (error) {
    console.error('[RoomController] Restore revision error:', error);
    res.status(500).json({ message: 'Failed to restore revision checkpoint.' });
  }
}

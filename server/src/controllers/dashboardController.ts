import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export async function getDashboardSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  const userId = req.user.id;

  try {
    // 1. My Whiteboards (Owned by user)
    const ownedRooms = await prisma.room.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
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
        _count: {
          select: {
            strokes: true,
            revisions: true,
          },
        },
      },
    });

    // 2. Shared With Me (User is a member but NOT the owner)
    const sharedMemberships = await prisma.roomMember.findMany({
      where: {
        userId,
        room: {
          ownerId: { not: userId },
        },
      },
      include: {
        room: {
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
            _count: {
              select: {
                strokes: true,
                revisions: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const sharedRooms = sharedMemberships.map((m) => m.room);

    // 3. Recent Activity Logs for User
    const recentActivity = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      myWhiteboards: ownedRooms,
      sharedWithMe: sharedRooms,
      recentActivity,
    });
  } catch (error) {
    console.error('[Dashboard] Error fetching dashboard summary:', error);
    res.status(500).json({ message: 'Failed to load dashboard summary.' });
  }
}

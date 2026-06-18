import { Request, Response, NextFunction } from 'express';
import { GroupRole } from '@prisma/client';
import { prisma } from '../config/database';

declare global {
  namespace Express {
    interface Request {
      userId: string;
      groupMembership?: {
        role: GroupRole;
        canSendMessages: boolean;
      };
    }
  }
}

export const requireMember = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.userId;

    const membership = await prisma.groupMember.findUnique({
  where: { groupId_userId: { groupId, userId } },
  select: { role: true, canSendMessages: true },
})

    if (!membership) {
      return res.status(403).json({ error: 'Вы не участник этой группы' });
    }

    req.groupMembership = membership as any;
    return next();
  } catch {
    return res.status(500).json({ error: 'Ошибка проверки прав' });
  }
};

export const requireOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.userId;

    const membership = await db.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
      select: { role: true, canSendMessages: true },
    });

    if (!membership || membership.role !== 'OWNER') {
      return res.status(403).json({ error: 'Только владелец может это делать' });
    }

    req.groupMembership = membership as any;
    return next();
  } catch {
    return res.status(500).json({ error: 'Ошибка проверки прав' });
  }
};
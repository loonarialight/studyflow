import { Request, Response } from 'express';
import * as groupService from '../services/groupService';
import {
  CreateGroupBody,
  UpdateGroupBody,
  JoinGroupBody,
  JoinByCodeBody,
  DayOffBody,
  AddViolationBody,
  SendMessageBody,
  TransferOwnerBody,
  GroupRole,
} from '../types/group';

// ─── GET /api/groups/my ───────────────────────────────────────────────────────

export const getMyGroups = async (req: Request, res: Response) => {
  try {
    const groups = await groupService.getMyGroups(req.userId);
    return res.json(groups);
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
};

// ─── POST /api/groups ─────────────────────────────────────────────────────────

export const createGroup = async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateGroupBody;

    if (!body.name?.trim()) {
      return res.status(400).json({ error: 'Укажите название группы' });
    }

    const group = await groupService.createGroup(req.userId, body);

    return res.status(201).json(group);
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
};

// ─── POST /api/groups/:id/join ────────────────────────────────────────────────

export const joinGroup = async (req: Request, res: Response) => {
  try {
    const { id: groupId } = req.params;
    const { password } = req.body as JoinGroupBody;

    const result = await groupService.joinGroup(req.userId, groupId, password);
    return res.status(200).json(result);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'NEED_PASSWORD') {
      return res.status(403).json({ error: 'NEED_PASSWORD', message: 'Требуется пароль' });
    }
    if (msg === 'Неверный пароль') {
      return res.status(403).json({ error: msg });
    }
    return res.status(400).json({ error: msg });
  }
};

// ─── POST /api/groups/join-by-code (deferred deep link) ──────────────────────

export const joinByCode = async (req: Request, res: Response) => {
  try {
    const { inviteCode, password } = req.body as JoinByCodeBody;

    if (!inviteCode?.trim()) {
      return res.status(400).json({ error: 'Укажите invite-код' });
    }

    const group = await groupService.getGroupByInviteCode(inviteCode.trim().toUpperCase());
    if (!group) {
      return res.status(404).json({ error: 'Группа с таким кодом не найдена' });
    }

    const result = await groupService.joinGroup(req.userId, group.id, password);
    return res.status(200).json(result);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'NEED_PASSWORD') {
      return res.status(403).json({ error: 'NEED_PASSWORD', message: 'Требуется пароль' });
    }
    return res.status(400).json({ error: msg });
  }
};

// ─── POST /api/groups/:id/leave ───────────────────────────────────────────────

export const leaveGroup = async (req: Request, res: Response) => {
  try {
    await groupService.leaveGroup(req.userId, req.params.id);
    return res.status(204).send();
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
};

// ─── PATCH /api/groups/:id ────────────────────────────────────────────────────

export const updateGroup = async (req: Request, res: Response) => {
  try {
    const group = await groupService.updateGroup(req.params.id, req.body as UpdateGroupBody);
    return res.json(group);
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
};

// ─── GET /api/groups/:id/members ─────────────────────────────────────────────

export const getMembers = async (req: Request, res: Response) => {
  try {
    const members = await groupService.getMembers(req.params.id);
    return res.json(members);
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
};

// ─── DELETE /api/groups/:id/members/:userId ───────────────────────────────────

export const kickMember = async (req: Request, res: Response) => {
  try {
    const { id: groupId, userId } = req.params;

    // Нельзя кикнуть самого себя через этот endpoint
    if (userId === req.userId) {
      return res.status(400).json({ error: 'Используйте /leave для выхода' });
    }
    // Нельзя кикнуть другого владельца
    const members = await groupService.getMembers(groupId);
    const target = members.find((m) => m.userId === userId);
    if (target?.role === GroupRole.OWNER) {
      return res.status(403).json({ error: 'Нельзя исключить владельца' });
    }

    await groupService.kickMember(groupId, userId);
    return res.status(204).send();
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
};

// ─── PUT /api/groups/:id/owner (그룹장 위임) ──────────────────────────────────

export const transferOwnership = async (req: Request, res: Response) => {
  try {
    const { newOwnerId } = req.body as TransferOwnerBody;
    if (!newOwnerId) {
      return res.status(400).json({ error: 'Укажите нового владельца' });
    }

    await groupService.transferOwnership(req.params.id, req.userId, newOwnerId);
    return res.status(204).send();
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
};

// ─── POST /api/groups/:id/dayoff ──────────────────────────────────────────────

/**
 * Явная write-операция пользователя.
 * Без этой записи при отсутствии активности = нарушение, не нейтральное событие.
 */
export const setDayOff = async (req: Request, res: Response) => {
  try {
    const { userId, status, date } = req.body as DayOffBody;

    // Участник может выставлять только свой day-off, владелец — любой
    if (userId !== req.userId && req.groupMembership?.role !== GroupRole.OWNER) {
      return res.status(403).json({ error: 'Нельзя выставить day-off за другого' });
    }

    const dayOff = await groupService.setDayOff(req.params.id, userId, status, date);
    return res.json(dayOff);
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
};

// ─── GET /api/groups/:id/chat ─────────────────────────────────────────────────

export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const before = req.query.before as string | undefined;
    const messages = await groupService.getChatMessages(req.params.id, before);
    return res.json(messages);
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
};

// ─── POST /api/groups/:id/chat ────────────────────────────────────────────────

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { content } = req.body as SendMessageBody;
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Пустое сообщение' });
    }

    const message = await groupService.sendMessage(
      req.params.id,
      req.userId,
      content.trim()
    );

    // Реалтайм-трансляция всем участникам комнаты группы
    const io = req.app.get('io');
    io?.to(`group:${req.params.id}`).emit('chat:message', message);

    return res.status(201).json(message);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Чат отключён' || msg === 'Нет прав на отправку сообщений') {
      return res.status(403).json({ error: msg });
    }
    return res.status(500).json({ error: msg });
  }
};

// ─── GET /api/groups/:id/stats/weekly ────────────────────────────────────────

export const getWeeklySnapshot = async (req: Request, res: Response) => {
  try {
    const snapshot = await groupService.getWeeklySnapshot(req.params.id);
    return res.json(snapshot);
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
};

// ─── POST /api/groups/:id/members/:userId/violations ─────────────────────────

export const addViolation = async (req: Request, res: Response) => {
  try {
    const { id: groupId, userId } = req.params;
    const { type, note } = req.body as AddViolationBody;

    if (!type) {
      return res.status(400).json({ error: 'Укажите тип нарушения' });
    }

    const violation = await groupService.addViolation(groupId, userId, type, note);
    return res.status(201).json(violation);
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
};

// ─── POST /api/groups/:id/invite ─────────────────────────────────────────────

export const regenerateInviteCode = async (req: Request, res: Response) => {
  try {
    const inviteCode = await groupService.regenerateInviteCode(req.params.id);
    return res.json({ inviteCode });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
};
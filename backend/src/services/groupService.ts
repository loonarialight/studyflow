import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { GroupRole, DayOffStatus, ViolationType } from '@prisma/client';
import {
  CreateGroupBody,
  UpdateGroupBody,
  ANTI_CHEAT,
} from '../types/group'; 
import { db } from '../lib/prisma';

// ─── Group CRUD ───────────────────────────────────────────────────────────────

export async function getMyGroups(userId: string) {
  const memberships = await db.groupMembership.findMany({
    where: { userId },
    include: { group: true },
  });
  return memberships.map((m: any) => m.group);
}

export async function createGroup(userId: string, body: CreateGroupBody) {
  const inviteCode = randomBytes(5).toString('hex').toUpperCase();
  const passwordHash =
    body.password ? await bcrypt.hash(body.password, 10) : null;

  return db.$transaction(async (tx: any) => {
    const group = await tx.group.create({
      data: {
        name: body.name,
        tag: body.name.toLowerCase().replace(/\s+/g, '_'),
        isPublic: body.visibility === 'public',
        createdBy: userId,
        passwordHash,
        inviteCode,
        chatEnabled: false,
        memberSendPermissionDefault: false,
        rulesText: body.rules.text,
        minStudyMinutesPerDay: body.rules.minStudyMinutesPerDay,
        maxDayOffsPerPeriod: body.rules.maxDayOffsPerPeriod,
        allowedApps: body.rules.allowedApps,
        announcement: body.announcement,
      },
    });

    await tx.groupMembership.create({
      data: {
        userId,
        groupId: group.id,
        role: GroupRole.OWNER,
        canSendMessages: true,
      },
    });

    return group;
  });
}

export async function getGroupById(groupId: string) {
  return db.group.findUnique({ where: { id: groupId } });
}

export async function getGroupByInviteCode(inviteCode: string) {
  return db.group.findFirst({ where: { inviteCode } });
}

export async function updateGroup(groupId: string, body: UpdateGroupBody) {
  return db.group.update({
    where: { id: groupId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.announcement !== undefined && { announcement: body.announcement }),
      ...(body.chatEnabled !== undefined && { chatEnabled: body.chatEnabled }),
      ...(body.memberSendPermissionDefault !== undefined && {
        memberSendPermissionDefault: body.memberSendPermissionDefault,
      }),
      ...(body.rules?.text !== undefined && { rulesText: body.rules.text }),
      ...(body.rules?.minStudyMinutesPerDay !== undefined && {
        minStudyMinutesPerDay: body.rules.minStudyMinutesPerDay,
      }),
      ...(body.rules?.maxDayOffsPerPeriod !== undefined && {
        maxDayOffsPerPeriod: body.rules.maxDayOffsPerPeriod,
      }),
      ...(body.rules?.allowedApps !== undefined && {
        allowedApps: body.rules.allowedApps,
      }),
    },
  });
}

export async function regenerateInviteCode(groupId: string) {
  const inviteCode = randomBytes(5).toString('hex').toUpperCase();
  await db.group.update({ where: { id: groupId }, data: { inviteCode } });
  return inviteCode;
}

// ─── Membership ───────────────────────────────────────────────────────────────

export async function joinGroup(
  userId: string,
  groupId: string,
  password?: string
) {
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group) throw new Error('Группа не найдена');

  // Приватная группа — проверяем пароль
  if (!group.isPublic) {
    if (!password) throw new Error('NEED_PASSWORD');
    const ok = (group as any).passwordHash
      ? await bcrypt.compare(password, (group as any).passwordHash)
      : false;
    if (!ok) throw new Error('Неверный пароль');
  }

  const existing = await db.groupMembership.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (existing) throw new Error('Вы уже в этой группе');

  const membership = await db.groupMembership.create({
    data: {
      userId,
      groupId,
      role: GroupRole.MEMBER,
      canSendMessages: (group as any).memberSendPermissionDefault ?? false,
    },
  });

  // Системное сообщение в чат
  if ((group as any).chatEnabled) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    await db.groupChatMessage.create({
      data: {
        groupId,
        userId,
        content: `${user?.name ?? 'Участник'} вступил в группу`,
        isSystem: true,
      },
    });
  }

  return { group, membership };
}

export async function leaveGroup(userId: string, groupId: string) {
  const membership = await db.groupMembership.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership) throw new Error('Вы не участник');
  if ((membership as any).role === GroupRole.OWNER)
    throw new Error('Владелец не может покинуть группу — сначала передайте права');

  await db.groupMembership.delete({
    where: { userId_groupId: { userId, groupId } },
  });
}

export async function getMembers(groupId: string) {
  const members = await db.groupMembership.findMany({
    where: { groupId },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
  });

  const today = new Date().toISOString().split('T')[0];
  const dayOffs = await db.groupDayOff.findMany({
    where: { groupId, date: today },
  });
  const violations = await db.groupViolation.findMany({
    where: { groupId },
  });

  return members.map((m: any) => ({
    userId: m.userId,
    groupId: m.groupId,
    role: m.role,
    nickname: m.user.name,           // их поле — name
    profileImageUrl: m.user.avatar,  // их поле — avatar
    joinedAt: m.joinedAt,
    canSendMessages: m.canSendMessages,
    dayOffStatusToday:
      dayOffs.find((d: any) => d.userId === m.userId)?.status ?? DayOffStatus.NONE,
    violations: violations.filter((v: any) => v.userId === m.userId),
    isStudyingNow: false,
    todayStudyMinutes: 0,
  }));
}

export async function kickMember(groupId: string, userId: string) {
  await db.groupMembership.delete({
    where: { userId_groupId: { userId, groupId } },
  });
}

export async function transferOwnership(
  groupId: string,
  currentOwnerId: string,
  newOwnerId: string
) {
  const newMember = await db.groupMembership.findUnique({
    where: { userId_groupId: { userId: newOwnerId, groupId } },
  });
  if (!newMember) throw new Error('Этот пользователь не в группе');

  return db.$transaction(async (tx: any) => {
    await tx.groupMembership.update({
      where: { userId_groupId: { userId: currentOwnerId, groupId } },
      data: { role: GroupRole.MEMBER },
    });
    await tx.groupMembership.update({
      where: { userId_groupId: { userId: newOwnerId, groupId } },
      data: { role: GroupRole.OWNER },
    });
    await tx.group.update({
      where: { id: groupId },
      data: { createdBy: newOwnerId },
    });
  });
}

// ─── Day-off ──────────────────────────────────────────────────────────────────

export async function setDayOff(
  groupId: string,
  userId: string,
  status: DayOffStatus,
  date: string
) {
  return db.groupDayOff.upsert({
    where: { userId_groupId_date: { userId, groupId, date } },
    create: { userId, groupId, date, status },
    update: { status },
  });
}

// ─── Чат ─────────────────────────────────────────────────────────────────────

/**
 * Приводим запись из БД (user: {name, avatar}, createdAt) к плоской
 * форме, которую ждёт фронтенд (nickname, profileImageUrl, sentAt).
 */
function toClientMessage(m: any) {
  return {
    id: m.id,
    groupId: m.groupId,
    userId: m.userId,
    nickname: m.user?.name ?? 'Участник',
    profileImageUrl: m.user?.avatar,
    content: m.content,
    sentAt: m.createdAt,
    isSystem: m.isSystem,
  };
}

export async function getChatMessages(groupId: string, before?: string) {
  const messages = await db.groupChatMessage.findMany({
    where: {
      groupId,
      ...(before && { createdAt: { lt: new Date(before) } }),
    },
    include: { user: { select: { name: true, avatar: true } } },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
  return messages.map(toClientMessage);
}

export async function sendMessage(groupId: string, userId: string, content: string) {
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!(group as any)?.chatEnabled) throw new Error('Чат отключён');

  const membership = await db.groupMembership.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership) throw new Error('Вы не участник');
  if (
    (membership as any).role !== GroupRole.OWNER &&
    !(membership as any).canSendMessages
  ) {
    throw new Error('Нет прав на отправку сообщений');
  }

  const message = await db.groupChatMessage.create({
    data: { groupId, userId, content, isSystem: false },
    include: { user: { select: { name: true, avatar: true } } },
  });
  return toClientMessage(message);
}

// ─── Weekly stats ─────────────────────────────────────────────────────────────

export async function getWeeklySnapshot(groupId: string) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const members = await db.groupMembership.findMany({
    where: { groupId },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
  });

  const memberStats = await Promise.all(
    members.map(async (m: any, i: number) => {
      const userId = m.userId;

      // Их поле — duration (не durationMinutes)
      const sessions = await (db as any).session.findMany({
        where: {
          userId,
          groupId,
          startedAt: { gte: weekStart, lte: weekEnd },
        },
      });

      // Anti-cheat: убираем непрерывные сессии >9ч
      const validSessions = sessions.filter(
        (s: any) => s.duration <= ANTI_CHEAT.MAX_CONTINUOUS_FOCUS_MINUTES
      );

      // Группируем по дням, убираем дни >20ч
      const byDay: Record<string, number> = {};
      for (const s of validSessions) {
        const day = s.startedAt.toISOString().split('T')[0];
        byDay[day] = (byDay[day] ?? 0) + s.duration;
      }
      const totalStudyMinutes = Object.values(byDay)
        .filter((mins) => mins <= ANTI_CHEAT.MAX_DAILY_STUDY_MINUTES)
        .reduce((a: number, b: number) => a + b, 0);

      const dayOffs = await db.groupDayOff.findMany({
        where: {
          userId,
          groupId,
          date: { gte: weekStart.toISOString().split('T')[0] },
        },
      });

      const activeDays = Object.keys(byDay).length + dayOffs.length;
      const attendanceRate = Math.min(activeDays / 7, 1);

      const violations = await db.groupViolation.count({
        where: { userId, groupId, createdAt: { gte: weekStart } },
      });

      return {
        userId,
        nickname: m.user.name,
        profileImageUrl: m.user.avatar,
        attendanceRate,
        totalStudyMinutes,
        camStudyMinutes: 0,
        missionCompletions: 0,
        dayOffs: dayOffs.length,
        violations,
        rank: i + 1,
      };
    })
  );

  memberStats.sort((a: any, b: any) => b.totalStudyMinutes - a.totalStudyMinutes);
  memberStats.forEach((m: any, i: number) => { m.rank = i + 1; });

  return {
    groupId,
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
    members: memberStats,
  };
}

// ─── Violations ───────────────────────────────────────────────────────────────

export async function addViolation(
  groupId: string,
  userId: string,
  type: ViolationType,
  note?: string
) {
  const today = new Date().toISOString().split('T')[0];
  return db.groupViolation.create({
    data: { groupId, userId, type, date: today, note },
  });
}
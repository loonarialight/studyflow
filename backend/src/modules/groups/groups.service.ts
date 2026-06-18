import { prisma } from '../../config/database'
import { AppError } from '../../middleware/errorHandler'
import { DayOffStatus } from '@prisma/client'

export const createGroup = async (userId: string, data: {
  name: string; description?: string; goal?: string; isPublic?: boolean
}) => {
  const tag = `@${data.name.toLowerCase().replace(/\s+/g, '_')}_${Math.floor(Math.random() * 9999)}`

  return prisma.group.create({
    data: {
      ...data,
      tag,
      createdBy: userId,
      members: {
        create: { userId, role: 'OWNER' },
      },
    },
    include: { members: true },
  })
}

export const listGroups = async (params: {
  search?: string; page?: number; limit?: number
}) => {
  const { search, page = 1, limit = 20 } = params
  const where: any = { isPublic: true }
  if (search) where.name = { contains: search, mode: 'insensitive' }

  const [groups, total] = await Promise.all([
    prisma.group.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.group.count({ where }),
  ])

  return { groups, total, page, limit }
}

export const getGroup = async (groupId: string) => {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, tag: true, avatar: true } },
        },
      },
      challenges: { where: { isActive: true }, take: 5 },
      _count: { select: { members: true } },
    },
  })
  if (!group) throw new AppError('Group not found', 404)
  return group
}

export const joinGroup = async (userId: string, groupId: string) => {
  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  })
  if (existing) throw new AppError('Already a member', 409)

  return prisma.groupMember.create({
    data: { userId, groupId, role: 'MEMBER' },
  })
}

export const leaveGroup = async (userId: string, groupId: string) => {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  })
  if (!member) throw new AppError('Not a member', 404)
  if (member.role === 'OWNER') throw new AppError('Owner cannot leave group', 400)

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId } },
  })
}

export const getGroupMessages = async (groupId: string, page = 1, limit = 50) => {
  const [messages, total] = await Promise.all([
    prisma.groupChatMessage.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, tag: true, avatar: true } },
      },
    }),
    prisma.groupChatMessage.count({ where: { groupId } }),
  ])

  return { messages: messages.reverse(), total, page, limit }
}

export const getGroupRankings = async (groupId: string) => {
  const members = await prisma.groupMember.findMany({
    where: { groupId, isActive: true },
    include: {
      user: {
        include: {
          analytics: {
            where: {
              date: {
                gte: new Date(Date.now() - 7 * 86400000),
              },
            },
          },
        },
      },
    },
  })

  return members
    .map(m => ({
      userId: m.userId,
      name: m.user.name,
      tag: m.user.tag,
      avatar: m.user.avatar,
      weeklyMinutes: m.user.analytics.reduce((s, a) => s + a.totalMinutes, 0),
    }))
    .sort((a, b) => b.weeklyMinutes - a.weeklyMinutes)
}

export const sendMessage = async (userId: string, groupId: string, content: string) => {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  })
  if (!member) throw new AppError('Not a member', 403)

  return prisma.groupChatMessage.create({
    data: { groupId, userId, content },
    include: {
      user: { select: { id: true, name: true, tag: true, avatar: true } },
    },
  })
}

// ─── Day-off ────────────────────────────────────────────────────────────────
// Day-off — явный статус, который ставит сам участник. Отсутствие активности
// БЕЗ выставленного статуса трактуется как нарушение, а не нейтральное событие.

export const setDayOff = async (
  userId: string,
  groupId: string,
  status: DayOffStatus,
  date: string
) => {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  })
  if (!member) throw new AppError('Not a member', 403)

  return prisma.groupDayOff.upsert({
    where: { userId_groupId_date: { userId, groupId, date } },
    create: { userId, groupId, date, status },
    update: { status },
  })
}

/** День по умолчанию — сегодня, если date не передан */
export const getDayOffs = async (groupId: string, date: string) => {
  return prisma.groupDayOff.findMany({
    where: { groupId, date },
  })
}

// ─── Presence ("кто сейчас учится") ──────────────────────────────────────────
// Аналог 캠스터디-вида: для каждого участника группы — учится ли он прямо
// сейчас (есть активная StudySession с endedAt: null) и сколько успел сегодня.
// Используем уже посчитанные Analytics.totalMinutes за завершённые сессии +
// досчитываем "на лету" текущую активную сессию.
//
// Anti-stale guard: если "активная" сессия идёт дольше разумного предела (9ч —
// тот же порог, что и anti-cheat на длительность непрерывного фокуса в спеке),
// считаем её зависшей (фронт потерял sessionId при перезагрузке и не остановил
// её) и не показываем как реальную активность — иначе одна забытая сессия
// портит цифры на недели вперёд.

const MAX_REASONABLE_ACTIVE_SECONDS = 9 * 60 * 60 // 9 часов

export const getGroupPresence = async (groupId: string) => {
  const members = await prisma.groupMember.findMany({
    where: { groupId, isActive: true },
    include: {
      user: { select: { id: true, name: true, tag: true, avatar: true } },
    },
  })

  const userIds = members.map((m) => m.userId)
  if (userIds.length === 0) return []

  const todayStart = new Date(new Date().toDateString())

  const [analytics, activeSessions] = await Promise.all([
    prisma.analytics.findMany({
      where: { userId: { in: userIds }, date: todayStart },
    }),
    prisma.studySession.findMany({
      where: { userId: { in: userIds }, endedAt: null },
      orderBy: { startedAt: 'desc' }, // самая свежая активная сессия — первая
    }),
  ])

  const presence = members.map((m) => {
    const a = analytics.find((x) => x.userId === m.userId)
    // Берём САМУЮ СВЕЖУЮ активную сессию пользователя (на случай если их
    // несколько из-за старого бага с зависанием)
    const active = activeSessions.find((s) => s.userId === m.userId)

    const baseSeconds = (a?.totalMinutes ?? 0) * 60

    let liveSeconds = 0
    let isStudyingNow = false

    if (active) {
      const elapsed = Math.max(0, Math.floor((Date.now() - active.startedAt.getTime()) / 1000))
      if (elapsed <= MAX_REASONABLE_ACTIVE_SECONDS) {
        liveSeconds = elapsed
        isStudyingNow = true
      }
      // иначе — зависшая сессия, игнорируем её полностью (не светим как активную,
      // не прибавляем её время)
    }

    return {
      userId: m.userId,
      name: m.user.name,
      tag: m.user.tag,
      avatar: m.user.avatar,
      isStudyingNow,
      todaySeconds: baseSeconds + liveSeconds,
      currentSubject: isStudyingNow ? active?.subject ?? null : null,
    }
  })

  return presence.sort((a, b) => b.todaySeconds - a.todaySeconds)
}
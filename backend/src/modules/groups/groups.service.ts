import { prisma } from '../../config/database'
import { AppError } from '../../middleware/errorHandler'

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
    prisma.chatMessage.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        sender: { select: { id: true, name: true, tag: true, avatar: true } },
      },
    }),
    prisma.chatMessage.count({ where: { groupId } }),
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

  return prisma.chatMessage.create({
    data: { groupId, senderId: userId, content },
    include: {
      sender: { select: { id: true, name: true, tag: true, avatar: true } },
    },
  })
}
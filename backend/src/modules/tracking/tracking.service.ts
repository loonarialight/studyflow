import { prisma } from '../../config/database'
import { AppError } from '../../middleware/errorHandler'

export const startSession = async (userId: string, data: {
  subject?: string
  categoryId?: string
  type?: string
  isPomodoro?: boolean
  groupId?: string
}) => {
  return prisma.studySession.create({
    data: {
      userId,
      subject: data.subject,
      categoryId: data.categoryId,
      type: (data.type as any) || 'REGULAR',
      isPomodoro: data.isPomodoro || false,
      groupId: data.groupId,
      startedAt: new Date(),
      duration: 0,
    },
  })
}

export const stopSession = async (userId: string, sessionId: string) => {
  const session = await prisma.studySession.findFirst({
    where: { id: sessionId, userId },
  })
  if (!session) throw new AppError('Session not found', 404)

  const endedAt = new Date()
  const duration = Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000)

  const updated = await prisma.studySession.update({
    where: { id: sessionId },
    data: { endedAt, duration },
  })

  // Update daily analytics
  await upsertAnalytics(userId, Math.round(duration / 60))

  return updated
}

export const getUserSessions = async (userId: string, params: {
  from?: string; to?: string; page?: number; limit?: number
}) => {
  const { from, to, page = 1, limit = 20 } = params
  const where: any = { userId }
  if (from || to) {
    where.startedAt = {}
    if (from) where.startedAt.gte = new Date(from)
    if (to) where.startedAt.lte = new Date(to)
  }

  const [sessions, total] = await Promise.all([
    prisma.studySession.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { category: true },
    }),
    prisma.studySession.count({ where }),
  ])

  return { sessions, total, page, limit }
}

export const getCategories = async (userId: string) => {
  return prisma.category.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    orderBy: { name: 'asc' },
  })
}

export const createCategory = async (userId: string, data: {
  name: string; color?: string; icon?: string
}) => {
  return prisma.category.create({
    data: { ...data, userId },
  })
}

const upsertAnalytics = async (userId: string, minutes: number) => {
  const today = new Date(new Date().toDateString())
  await prisma.analytics.upsert({
    where: { userId_date: { userId, date: today } },
    update: {
      totalMinutes: { increment: minutes },
      sessionsCount: { increment: 1 },
    },
    create: {
      userId,
      date: today,
      totalMinutes: minutes,
      sessionsCount: 1,
    },
  })
}

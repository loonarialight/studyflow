import { prisma } from '../../config/database'

export const getDailyAnalytics = async (userId: string, from: string, to: string) => {
  return prisma.analytics.findMany({
    where: {
      userId,
      date: {
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    orderBy: { date: 'asc' },
  })
}

export const getWeeklySummary = async (userId: string) => {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [analytics, topSubjects, streak] = await Promise.all([
    prisma.analytics.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      orderBy: { date: 'asc' },
    }),
    prisma.studySession.groupBy({
      by: ['subject'],
      where: {
        userId,
        startedAt: { gte: sevenDaysAgo },
        subject: { not: null },
      },
      _sum: { duration: true },
      orderBy: { _sum: { duration: 'desc' } },
      take: 5,
    }),
    getCurrentStreak(userId),
  ])

  const totalMinutes = analytics.reduce((sum, d) => sum + d.totalMinutes, 0)
  const totalSessions = analytics.reduce((sum, d) => sum + d.sessionsCount, 0)
  const avgDailyMinutes = Math.round(totalMinutes / 7)

  return {
    totalMinutes,
    totalSessions,
    avgDailyMinutes,
    streak,
    topSubjects: topSubjects.map(s => ({
      subject: s.subject,
      minutes: Math.round((s._sum.duration || 0) / 60),
    })),
    dailyData: analytics,
  }
}

export const getCurrentStreak = async (userId: string): Promise<number> => {
  const records = await prisma.analytics.findMany({
    where: { userId, totalMinutes: { gt: 0 } },
    orderBy: { date: 'desc' },
    select: { date: true },
  })

  let streak = 0
  const today = new Date(new Date().toDateString())

  for (let i = 0; i < records.length; i++) {
    const expected = new Date(today)
    expected.setDate(expected.getDate() - i)
    const recordDate = new Date(records[i].date.toDateString())
    if (recordDate.getTime() === expected.getTime()) {
      streak++
    } else {
      break
    }
  }

  return streak
}

export const getHeatmapData = async (userId: string, year: number) => {
  const from = new Date(`${year}-01-01`)
  const to = new Date(`${year}-12-31`)

  const data = await prisma.analytics.findMany({
    where: { userId, date: { gte: from, lte: to } },
    select: { date: true, totalMinutes: true },
  })

  return data.map(d => ({
    date: d.date.toISOString().split('T')[0],
    value: d.totalMinutes,
  }))
}

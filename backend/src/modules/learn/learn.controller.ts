import { Request, Response } from 'express'
import { prisma } from '../../config/database'
import { AuthRequest } from '../../middleware/auth.middleware'

// GET /api/learn/tracks
export const getTracks = async (_req: Request, res: Response) => {
  const tracks = await prisma.educationTrack.findMany({
    where: { isActive: true },
    include: { _count: { select: { grades: true } } },
    orderBy: { name: 'asc' },
  })
  res.json({ data: tracks })
}

// GET /api/learn/tracks/:slug/subjects
export const getSubjectsByTrack = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id

  const track = await prisma.educationTrack.findUnique({
    where: { slug: req.params.slug },
  })
  if (!track) return res.status(404).json({ message: 'Track not found' })

  const subjects = await prisma.subject.findMany({
    where: { trackId: track.id },
    include: {
      _count: { select: { chapters: true } },
      ...(userId && { progress: { where: { userId } } }),
    },
    orderBy: [{ grade: 'asc' }, { order: 'asc' }],
  })

  res.json({
    data: {
      track,
      subjects: subjects.map((s) => ({ ...s, progress: (s as any).progress?.[0] ?? null })),
    },
  })
}

// GET /api/learn/subjects/:id
export const getSubject = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id

  const subject = await prisma.subject.findUnique({
    where: { id: req.params.id },
  })
  if (!subject) return res.status(404).json({ message: 'Subject not found' })

  const chapters = await prisma.chapter.findMany({
    where: { subjectId: subject.id },
    include: {
      lessons: {
        where: { isPublished: true },
        include: {
          _count: { select: { questions: true } },
          ...(userId && { progress: { where: { userId } } }),
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  })

  const mapped = chapters.map((c) => ({
    ...c,
    lessons: c.lessons.map((l) => ({
      ...l,
      progress: (l as any).progress?.[0] ?? null,
    })),
  }))

  res.json({ data: { subject, chapters: mapped } })
}

// GET /api/learn/lessons/:id
export const getLesson = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id

  const lesson = await prisma.lesson.findUnique({
    where: { id: req.params.id, isPublished: true },
    include: {
      ...(userId && { progress: { where: { userId } } }),
    },
  })
  if (!lesson) return res.status(404).json({ message: 'Lesson not found' })

  const questions = await prisma.question.findMany({
    where: { lessonId: lesson.id },
    orderBy: { order: 'asc' },
  })

  res.json({
    data: {
      lesson: { ...lesson, progress: (lesson as any).progress?.[0] ?? null },
      questions,
    },
  })
}

// POST /api/learn/lessons/:id/submit
export const submitTest = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id
  const { answers } = req.body as { answers: Record<string, string[]> }

  const questions = await prisma.question.findMany({
    where: { lessonId: req.params.id },
  })

  let score = 0
  let total = 0

  for (const q of questions) {
    const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options as string)
    const correctIds = (opts as any[]).filter((o) => o.isCorrect).map((o) => o.id)
    const userIds = answers[q.id] ?? []
    total += q.points

    const isCorrect =
      correctIds.length === userIds.length &&
      correctIds.every((id: string) => userIds.includes(id))

    if (isCorrect) score += q.points
  }

  const passScore = Math.ceil(total * 0.7)
  const passed = score >= passScore

  if (userId) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: req.params.id } },
      update: {
        score,
        attempts: { increment: 1 },
        isCompleted: passed,
        completedAt: passed ? new Date() : null,
      },
      create: {
        userId,
        lessonId: req.params.id,
        score,
        attempts: 1,
        isCompleted: passed,
        completedAt: passed ? new Date() : null,
      },
    })
  }

  res.json({ data: { score, total, passed } })
}

// POST /api/learn/lessons/:id/complete
export const completeLesson = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id

  if (userId) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: req.params.id } },
      update: { isCompleted: true, completedAt: new Date() },
      create: {
        userId,
        lessonId: req.params.id,
        isCompleted: true,
        completedAt: new Date(),
      },
    })
  }

  res.json({ ok: true })
}

// GET /api/learn/planner
export const getPlanner = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id
  const { slug = 'highschool' } = req.query as { slug?: string }

  const track = await prisma.educationTrack.findUnique({ where: { slug } })
  if (!track) return res.status(404).json({ message: 'Track not found' })

  const subjects = await prisma.subject.findMany({
    where: { trackId: track.id },
    include: {
      chapters: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { order: 'asc' },
            include: {
              ...(userId && { progress: { where: { userId } } }),
            },
          },
        },
      },
    },
    orderBy: [{ grade: 'asc' }, { order: 'asc' }],
  })

  const mapped = subjects.map((s) => ({
    ...s,
    chapters: s.chapters.map((c) => ({
      ...c,
      lessons: c.lessons.map((l) => ({
        ...l,
        progress: (l as any).progress?.[0] ?? null,
      })),
    })),
  }))

  res.json({ data: mapped })
}
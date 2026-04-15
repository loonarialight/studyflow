import { Request, Response } from 'express'
import { prisma } from '../../config/database'

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export const getDashboard = async (_req: Request, res: Response) => {
  const [users, tracks, subjects, lessons, questions] = await Promise.all([
    prisma.user.count(),
    prisma.educationTrack.count(),
    prisma.subject.count(),
    prisma.lesson.count(),
    prisma.question.count(),
  ])

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  res.json({ stats: { users, tracks, subjects, lessons, questions }, recentUsers })
}

// ─── TRACKS ───────────────────────────────────────────────────────────────────

export const getTracks = async (_req: Request, res: Response) => {
  const tracks = await prisma.educationTrack.findMany({
    include: { _count: { select: { grades: true } } },
    orderBy: { name: 'asc' },
  })
  res.json(tracks)
}

export const createTrack = async (req: Request, res: Response) => {
  const { name, slug, description, icon } = req.body
  const track = await prisma.educationTrack.create({
    data: { name, slug, description, icon },
  })
  res.status(201).json(track)
}

export const updateTrack = async (req: Request, res: Response) => {
  const track = await prisma.educationTrack.update({
    where: { id: req.params.id },
    data: req.body,
  })
  res.json(track)
}

export const deleteTrack = async (req: Request, res: Response) => {
  await prisma.educationTrack.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
}

// ─── SUBJECTS ─────────────────────────────────────────────────────────────────

export const getSubjects = async (req: Request, res: Response) => {
  const where = req.query.trackId ? { trackId: req.query.trackId as string } : {}
  const subjects = await prisma.subject.findMany({
    where,
    include: {
      track: { select: { name: true } },
      _count: { select: { chapters: true } },
    },
    orderBy: [{ trackId: 'asc' }, { order: 'asc' }],
  })
  res.json(subjects)
}

export const createSubject = async (req: Request, res: Response) => {
  const subject = await prisma.subject.create({ data: req.body })
  res.status(201).json(subject)
}

export const updateSubject = async (req: Request, res: Response) => {
  const subject = await prisma.subject.update({
    where: { id: req.params.id },
    data: req.body,
  })
  res.json(subject)
}

export const deleteSubject = async (req: Request, res: Response) => {
  await prisma.subject.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
}

// ─── CHAPTERS ─────────────────────────────────────────────────────────────────

export const getChapters = async (req: Request, res: Response) => {
  const chapters = await prisma.chapter.findMany({
    where: { subjectId: req.query.subjectId as string },
    include: { _count: { select: { lessons: true } } },
    orderBy: { order: 'asc' },
  })
  res.json(chapters)
}

export const createChapter = async (req: Request, res: Response) => {
  const chapter = await prisma.chapter.create({ data: req.body })
  res.status(201).json(chapter)
}

export const updateChapter = async (req: Request, res: Response) => {
  const chapter = await prisma.chapter.update({
    where: { id: req.params.id },
    data: req.body,
  })
  res.json(chapter)
}

export const deleteChapter = async (req: Request, res: Response) => {
  await prisma.chapter.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
}

// ─── LESSONS ──────────────────────────────────────────────────────────────────

export const getLessons = async (req: Request, res: Response) => {
  const where = req.query.chapterId ? { chapterId: req.query.chapterId as string } : {}
  const lessons = await prisma.lesson.findMany({
    where,
    include: {
      chapter: { select: { title: true, subject: { select: { name: true } } } },
      _count: { select: { questions: true } },
    },
    orderBy: { order: 'asc' },
  })
  res.json(lessons)
}

export const getLessonById = async (req: Request, res: Response) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: req.params.id },
    include: { questions: { orderBy: { order: 'asc' } } },
  })
  if (!lesson) return res.status(404).json({ message: 'Урок не найден' })
  res.json(lesson)
}

export const createLesson = async (req: Request, res: Response) => {
  const lesson = await prisma.lesson.create({ data: req.body })
  res.status(201).json(lesson)
}

export const updateLesson = async (req: Request, res: Response) => {
  const lesson = await prisma.lesson.update({
    where: { id: req.params.id },
    data: req.body,
  })
  res.json(lesson)
}

export const deleteLesson = async (req: Request, res: Response) => {
  await prisma.lesson.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
}

export const publishLesson = async (req: Request, res: Response) => {
  const lesson = await prisma.lesson.update({
    where: { id: req.params.id },
    data: { isPublished: req.body.isPublished },
  })
  res.json(lesson)
}

// ─── QUESTIONS ────────────────────────────────────────────────────────────────

export const getQuestions = async (req: Request, res: Response) => {
  const questions = await prisma.question.findMany({
    where: { lessonId: req.query.lessonId as string },
    orderBy: { order: 'asc' },
  })
  res.json(questions)
}

export const createQuestion = async (req: Request, res: Response) => {
  const question = await prisma.question.create({ data: req.body })
  res.status(201).json(question)
}

export const updateQuestion = async (req: Request, res: Response) => {
  const question = await prisma.question.update({
    where: { id: req.params.id },
    data: req.body,
  })
  res.json(question)
}

export const deleteQuestion = async (req: Request, res: Response) => {
  await prisma.question.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
}

// bulk create/replace questions for a lesson
export const bulkSaveQuestions = async (req: Request, res: Response) => {
  const { lessonId, questions } = req.body

  await prisma.question.deleteMany({ where: { lessonId } })

  const created = await prisma.question.createMany({
    data: questions.map((q: any) => ({
      lessonId,
      text: q.text,
      type: q.type as 'SINGLE' | 'MULTIPLE' | 'TRUE_FALSE' | 'TEXT',
      options: q.options,
      explanation: q.explanation,
      hint: q.hint,
      points: q.points,
      order: q.order,
    })),
  })

  res.json({ created: created.count })
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export const getUsers = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1
  const limit = 20
  const search = req.query.search as string | undefined

  const where = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, tag: true,
        role: true, isPremium: true, isVerified: true, createdAt: true,
        _count: { select: { sessions: true, aiChats: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  res.json({ users, total, page, pages: Math.ceil(total / limit) })
}

export const updateUserRole = async (req: Request, res: Response) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role: req.body.role },
    select: { id: true, name: true, role: true },
  })
  res.json(user)
}

export const deleteUser = async (req: Request, res: Response) => {
  await prisma.user.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
}
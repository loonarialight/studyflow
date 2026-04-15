import { Response } from 'express'
import { prisma } from '../../config/database'
import { AuthRequest } from '../../middleware/auth.middleware'
import { successResponse } from '../../utils/response'

export const getTasks = async (req: AuthRequest, res: Response) => {
  const tasks = await prisma.task.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  })
  return successResponse(res, tasks)
}

export const createTask = async (req: AuthRequest, res: Response) => {
  const { title, priority, dueDate, subjectId, syncCalendar } = req.body

  const task = await prisma.task.create({
    data: {
      userId: req.user!.id,
      title,
      priority: priority ?? 'MEDIUM',
      status: 'TODO',
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  })

  // Sync to calendar if dueDate provided
  if (dueDate && syncCalendar) {
    const start = new Date(dueDate)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    await prisma.calendarEvent.create({
      data: {
        userId: req.user!.id,
        title: `📝 ${title}`,
        startAt: start,
        endAt: end,
        type: 'STUDY',
        color: '#7C6FE0',
      },
    })
  }

  return successResponse(res, task, 'Task created', 201)
}

export const updateTask = async (req: AuthRequest, res: Response) => {
  const task = await prisma.task.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  })
  if (!task) return res.status(404).json({ message: 'Not found' })

  const updated = await prisma.task.update({
    where: { id: req.params.id },
    data: req.body,
  })
  return successResponse(res, updated)
}

export const deleteTask = async (req: AuthRequest, res: Response) => {
  await prisma.task.deleteMany({
    where: { id: req.params.id, userId: req.user!.id },
  })
  return successResponse(res, null, 'Deleted')
}
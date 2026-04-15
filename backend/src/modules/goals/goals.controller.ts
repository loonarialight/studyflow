import { Response } from 'express'
import { prisma } from '../../config/database'
import { AuthRequest } from '../../middleware/auth.middleware'

export const getGoals = async (req: AuthRequest, res: Response) => {
  const goals = await prisma.goal.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
  })
  res.json({ data: goals })
}

export const createGoal = async (req: AuthRequest, res: Response) => {
  const { title, deadline, color, isPrimary } = req.body
  const userId = req.user!.id

  if (isPrimary) {
    await prisma.goal.updateMany({ where: { userId }, data: { isPrimary: false } })
  }

  const goal = await prisma.goal.create({
    data: { userId, title, deadline: deadline ? new Date(deadline) : null, color: color ?? '#7c3aed', isPrimary: isPrimary ?? false },
  })
  res.json({ data: goal })
}

export const updateGoal = async (req: AuthRequest, res: Response) => {
  const { title, deadline, color, isPrimary, isCompleted } = req.body
  const userId = req.user!.id

  if (isPrimary) {
    await prisma.goal.updateMany({ where: { userId }, data: { isPrimary: false } })
  }

  const goal = await prisma.goal.update({
    where: { id: req.params.id },
    data: { title, deadline: deadline ? new Date(deadline) : null, color, isPrimary, isCompleted },
  })
  res.json({ data: goal })
}

export const deleteGoal = async (req: AuthRequest, res: Response) => {
  await prisma.goal.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
}

export const setPrimary = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id
  await prisma.goal.updateMany({ where: { userId }, data: { isPrimary: false } })
  const goal = await prisma.goal.update({
    where: { id: req.params.id },
    data: { isPrimary: true },
  })
  res.json({ data: goal })
}
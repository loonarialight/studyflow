import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '@/config/env'
import { prisma } from '../config/database'

export interface AdminRequest extends Request {
  adminId?: string
}

export const adminMiddleware = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Нет токена' })
    }

    const token = authHeader.split(' ')[1]
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true },
    })

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Доступ запрещён' })
    }

    req.adminId = user.id
    next()
  } catch {
    return res.status(401).json({ message: 'Невалидный токен' })
  }
}
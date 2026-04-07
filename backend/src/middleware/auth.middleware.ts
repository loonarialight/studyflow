import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'
import { prisma } from '../config/database'
import { errorResponse } from '../utils/response'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    name: string
    isPremium: boolean
  }
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(res, 'No token provided', 401)
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyAccessToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, isPremium: true },
    })

    if (!user) return errorResponse(res, 'User not found', 401)

    req.user = user
    next()
  } catch {
    return errorResponse(res, 'Invalid or expired token', 401)
  }
}

export const premiumMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.isPremium) {
    return errorResponse(res, 'Premium subscription required', 403)
  }
  next()
}

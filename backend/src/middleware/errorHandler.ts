import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message)

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    })
  }

  // Prisma errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any
    if (prismaErr.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Already exists: ' + prismaErr.meta?.target?.join(', '),
      })
    }
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  })
}

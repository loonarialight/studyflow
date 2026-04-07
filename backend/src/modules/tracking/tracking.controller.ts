import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import * as svc from './tracking.service'
import { successResponse, paginatedResponse } from '../../utils/response'

/**
 * @swagger
 * /api/tracking/sessions:
 *   get:
 *     tags: [Tracking]
 *     summary: Get user study sessions
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of sessions with pagination
 *
 *   post:
 *     tags: [Tracking]
 *     summary: Start a new study session
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject: { type: string, example: Математика }
 *               categoryId: { type: string, format: uuid }
 *               type:
 *                 type: string
 *                 enum: [REGULAR, FOCUS, POMODORO, GROUP]
 *               isPomodoro: { type: boolean }
 *     responses:
 *       201:
 *         description: Session started
 */
export const getSessions = async (req: AuthRequest, res: Response) => {
  const result = await svc.getUserSessions(req.user!.id, {
    from: req.query.from as string,
    to: req.query.to as string,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  })
  return paginatedResponse(res, result.sessions, result.total, result.page, result.limit)
}

export const startSession = async (req: AuthRequest, res: Response) => {
  const session = await svc.startSession(req.user!.id, req.body)
  return successResponse(res, session, 'Session started', 201)
}

/**
 * @swagger
 * /api/tracking/sessions/{id}/stop:
 *   patch:
 *     tags: [Tracking]
 *     summary: Stop a study session
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Session stopped with duration
 */
export const stopSession = async (req: AuthRequest, res: Response) => {
  const session = await svc.stopSession(req.user!.id, req.params.id)
  return successResponse(res, session, 'Session stopped')
}

/**
 * @swagger
 * /api/tracking/categories:
 *   get:
 *     tags: [Tracking]
 *     summary: Get categories (user + global presets)
 *     responses:
 *       200:
 *         description: List of categories
 *
 *   post:
 *     tags: [Tracking]
 *     summary: Create custom category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               color: { type: string, example: '#7C6FE0' }
 *               icon: { type: string, example: '📚' }
 *     responses:
 *       201:
 *         description: Category created
 */
export const getCategories = async (req: AuthRequest, res: Response) => {
  const categories = await svc.getCategories(req.user!.id)
  return successResponse(res, categories)
}

export const createCategory = async (req: AuthRequest, res: Response) => {
  const category = await svc.createCategory(req.user!.id, req.body)
  return successResponse(res, category, 'Category created', 201)
}

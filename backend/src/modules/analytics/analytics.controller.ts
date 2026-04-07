import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import * as svc from './analytics.service'
import { successResponse } from '../../utils/response'

/**
 * @swagger
 * /api/analytics/weekly:
 *   get:
 *     tags: [Analytics]
 *     summary: Get weekly summary with streak and top subjects
 *     responses:
 *       200:
 *         description: Weekly analytics summary
 *
 * /api/analytics/daily:
 *   get:
 *     tags: [Analytics]
 *     summary: Get daily analytics for date range
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Daily analytics data
 *
 * /api/analytics/heatmap:
 *   get:
 *     tags: [Analytics]
 *     summary: Get heatmap data for a year
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer, example: 2025 }
 *     responses:
 *       200:
 *         description: Heatmap data array
 */
export const weekly = async (req: AuthRequest, res: Response) => {
  const data = await svc.getWeeklySummary(req.user!.id)
  return successResponse(res, data)
}

export const daily = async (req: AuthRequest, res: Response) => {
  const { from, to } = req.query
  const data = await svc.getDailyAnalytics(
    req.user!.id,
    (from as string) || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    (to as string) || new Date().toISOString().split('T')[0]
  )
  return successResponse(res, data)
}

export const heatmap = async (req: AuthRequest, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear()
  const data = await svc.getHeatmapData(req.user!.id, year)
  return successResponse(res, data)
}

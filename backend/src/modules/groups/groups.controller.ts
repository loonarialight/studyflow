import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import * as svc from './groups.service'
import { successResponse, paginatedResponse } from '../../utils/response'

/**
 * @swagger
 * /api/groups:
 *   get:
 *     tags: [Groups]
 *     summary: List public groups
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Paginated groups list
 *
 *   post:
 *     tags: [Groups]
 *     summary: Create a new group
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               goal: { type: string }
 *               isPublic: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Group created
 *
 * /api/groups/{id}:
 *   get:
 *     tags: [Groups]
 *     summary: Get group details with members
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Group details
 *
 * /api/groups/{id}/join:
 *   post:
 *     tags: [Groups]
 *     summary: Join a group
 *     responses:
 *       200:
 *         description: Joined
 *
 * /api/groups/{id}/rankings:
 *   get:
 *     tags: [Groups]
 *     summary: Get weekly rankings for group
 *     responses:
 *       200:
 *         description: Rankings sorted by weekly minutes
 *
 * /api/groups/{id}/messages:
 *   get:
 *     tags: [Groups]
 *     summary: Get group chat messages
 *     responses:
 *       200:
 *         description: Chat messages
 *
 * /api/groups/{id}/dayoff:
 *   post:
 *     tags: [Groups]
 *     summary: Set your own day-off status for a given date
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status, date]
 *             properties:
 *               status: { type: string, enum: [NONE, HALF, FULL] }
 *               date: { type: string, example: "2026-06-19" }
 *     responses:
 *       200:
 *         description: Day-off updated
 *
 *   get:
 *     tags: [Groups]
 *     summary: Get day-off statuses for all members on a given date
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, example: "2026-06-19" }
 *     responses:
 *       200:
 *         description: List of day-off records for that date
 *
 * /api/groups/{id}/presence:
 *   get:
 *     tags: [Groups]
 *     summary: Live "who is studying now" view for the group
 *     responses:
 *       200:
 *         description: List of members with isStudyingNow + todaySeconds, sorted by todaySeconds desc
 */
export const list = async (req: AuthRequest, res: Response) => {
  const result = await svc.listGroups({
    search: req.query.search as string,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  })
  return paginatedResponse(res, result.groups, result.total, result.page, result.limit)
}

export const create = async (req: AuthRequest, res: Response) => {
  const group = await svc.createGroup(req.user!.id, req.body)
  return successResponse(res, group, 'Group created', 201)
}

export const getOne = async (req: AuthRequest, res: Response) => {
  const group = await svc.getGroup(req.params.id)
  return successResponse(res, group)
}

export const join = async (req: AuthRequest, res: Response) => {
  await svc.joinGroup(req.user!.id, req.params.id)
  return successResponse(res, null, 'Joined group')
}

export const leave = async (req: AuthRequest, res: Response) => {
  await svc.leaveGroup(req.user!.id, req.params.id)
  return successResponse(res, null, 'Left group')
}

export const rankings = async (req: AuthRequest, res: Response) => {
  const data = await svc.getGroupRankings(req.params.id)
  return successResponse(res, data)
}

export const messages = async (req: AuthRequest, res: Response) => {
  const result = await svc.getGroupMessages(
    req.params.id,
    Number(req.query.page) || 1
  )
  return paginatedResponse(res, result.messages, result.total, result.page, result.limit)
}

export const sendMessage = async (req: AuthRequest, res: Response) => {
  const message = await svc.sendMessage(req.user!.id, req.params.id, req.body.content)
  return successResponse(res, message, 'Message sent', 201)
}

// ─── Day-off ────────────────────────────────────────────────────────────────

export const setDayOff = async (req: AuthRequest, res: Response) => {
  const { status, date } = req.body as { status?: 'NONE' | 'HALF' | 'FULL'; date?: string }

  if (!status || !date) {
    return res.status(400).json({ success: false, message: 'status and date are required' })
  }

  const dayOff = await svc.setDayOff(req.user!.id, req.params.id, status as any, date)
  return successResponse(res, dayOff, 'Day-off updated')
}

export const getDayOffs = async (req: AuthRequest, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0]
  const dayOffs = await svc.getDayOffs(req.params.id, date)
  return successResponse(res, dayOffs)
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export const presence = async (req: AuthRequest, res: Response) => {
  const data = await svc.getGroupPresence(req.params.id)
  return successResponse(res, data)
}
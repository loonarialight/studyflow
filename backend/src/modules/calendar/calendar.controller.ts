import { Response } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import * as svc from './calendar.service'
import { successResponse } from '../../utils/response'

/**
 * @swagger
 * /api/calendar/events:
 *   get:
 *     tags: [Calendar]
 *     summary: Get calendar events
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: List of events
 *
 *   post:
 *     tags: [Calendar]
 *     summary: Create calendar event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, startAt, endAt]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               startAt: { type: string, format: date-time }
 *               endAt: { type: string, format: date-time }
 *               color: { type: string }
 *               type:
 *                 type: string
 *                 enum: [STUDY, TEST, CLASS, PERSONAL, GROUP]
 *               syncGoogle: { type: boolean, description: Sync to Google Calendar }
 *     responses:
 *       201:
 *         description: Event created
 *
 * /api/calendar/events/{id}:
 *   delete:
 *     tags: [Calendar]
 *     summary: Delete event (also removes from Google Calendar if synced)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 *
 * /api/calendar/sync:
 *   post:
 *     tags: [Calendar]
 *     summary: Sync events from Google Calendar
 *     responses:
 *       200:
 *         description: Synced count
 */
export const getEvents = async (req: AuthRequest, res: Response) => {
  const events = await svc.getEvents(
    req.user!.id,
    req.query.from as string,
    req.query.to as string
  )
  return successResponse(res, events)
}

export const createEvent = async (req: AuthRequest, res: Response) => {
  const event = await svc.createEvent(req.user!.id, req.body)
  return successResponse(res, event, 'Event created', 201)
}

export const deleteEvent = async (req: AuthRequest, res: Response) => {
  await svc.deleteEvent(req.user!.id, req.params.id)
  return successResponse(res, null, 'Event deleted')
}

export const syncFromGoogle = async (req: AuthRequest, res: Response) => {
  const result = await svc.syncFromGoogle(req.user!.id)
  return successResponse(res, result, `Synced ${result.synced} events`)
}

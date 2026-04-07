import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import * as svc from './ai.service'
import * as calSvc from '../calendar/calendar.service'
import { successResponse } from '../../utils/response'
import { AppError } from '../../middleware/errorHandler'

// GET /api/ai/chats
export const getChats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chats = await svc.getChats(req.user!.id)
    return successResponse(res, chats)
  } catch (err) { next(err) }
}

// POST /api/ai/chats
export const createChat = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chat = await svc.createChat(req.user!.id, req.body.title)
    return successResponse(res, chat, 'Chat created', 201)
  } catch (err) { next(err) }
}

// DELETE /api/ai/chats/:id
export const deleteChat = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await svc.deleteChat(req.user!.id, req.params.id)
    return successResponse(res, null, 'Chat deleted')
  } catch (err) { next(err) }
}

// GET /api/ai/chats/:id/messages
export const getMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const messages = await svc.getMessages(req.user!.id, req.params.id)
    return successResponse(res, messages)
  } catch (err) { next(err) }
}

// POST /api/ai/chats/:id/messages
export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body
    if (!message?.trim()) throw new AppError('Message is required', 400)

    const result = await svc.sendMessage(req.user!.id, req.params.id, message.trim())

    // ── Create calendar events if AI produced them ──────────────────────────
    let calendarEventsCreated = 0
    const eventsToCreate = result.createdEvents

    if (eventsToCreate && eventsToCreate.length > 0) {
      const settled = await Promise.allSettled(
        eventsToCreate.map(e =>
          calSvc.createEvent(req.user!.id, {
            title:       e.title,
            description: e.description,
            startAt:     e.startAt,
            endAt:       e.endAt,
            type:        e.type,
            color:       e.color,
            syncGoogle:  false,
          })
        )
      )

      // Log failures so they're visible in server logs
      settled.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`[AI] Failed to create event "${eventsToCreate[i].title}":`, r.reason)
        }
      })

      calendarEventsCreated = settled.filter(r => r.status === 'fulfilled').length
    }


    // ── Delete events if AI produced a delete filter ──────────────────────
    let calendarEventsDeleted = 0
    const df = result.deleteFilter
    if (df && (df.titleContains || df.date)) {
      const { prisma } = await import('../../config/database')
      const where: any = { userId: req.user!.id }
      if (df.date) {
        const d = new Date(df.date)
        const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0)
        const dayEnd   = new Date(d); dayEnd.setHours(23, 59, 59, 999)
        where.startAt = { gte: dayStart, lte: dayEnd }
      }
      if (df.titleContains) {
        where.title = { contains: df.titleContains, mode: 'insensitive' }
      }
      const { count } = await prisma.calendarEvent.deleteMany({ where })
      calendarEventsDeleted = count
    }

    return successResponse(res, {
      message:               result.message,
      calendarEventsCreated,
      calendarEventsDeleted,
      conflicts:             result.conflicts ?? [],
    })
  } catch (err) { next(err) }
}

// POST /api/ai/parse-schedule
export const parseSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { text } = req.body
    if (!text?.trim()) throw new AppError('Provide schedule text', 400)
    const events = await svc.parseScheduleFromText(text.trim())
    return successResponse(res, { events })
  } catch (err) { next(err) }
}

// POST /api/ai/import-events
export const importEvents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { events } = req.body as { events: svc.ParsedEvent[] }
    if (!events?.length) throw new AppError('No events to import', 400)

    const created = await Promise.all(
      events.map(e => calSvc.createEvent(req.user!.id, {
        title:       e.title,
        description: e.description,
        startAt:     e.startAt,
        endAt:       e.endAt,
        type:        e.type,
        color:       e.color,
        syncGoogle:  false,
      }))
    )

    return successResponse(res, { created: created.length }, `Imported ${created.length} events`, 201)
  } catch (err) { next(err) }
}
import { google } from 'googleapis'
import { prisma } from '../../config/database'
import { env } from '../../config/env'
import { AppError } from '../../middleware/errorHandler'

const getGoogleClient = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleTokens: true },
  })
  if (!user?.googleTokens) throw new AppError('Google Calendar not connected', 400)

  const auth = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
  )
  auth.setCredentials(user.googleTokens as any)
  return auth
}

export const getEvents = async (userId: string, from?: string, to?: string) => {
  const where: any = { userId }
  if (from || to) {
    where.startAt = {}
    if (from) where.startAt.gte = new Date(from)
    if (to)   where.startAt.lte = new Date(to)
  }
  return prisma.calendarEvent.findMany({
    where,
    orderBy: { startAt: 'asc' },
  })
}

export const createEvent = async (userId: string, data: {
  title: string
  description?: string
  startAt: string
  endAt: string
  color?: string
  type?: string
  syncGoogle?: boolean
}) => {
  const event = await prisma.calendarEvent.create({
    data: {
      userId,
      title:       data.title,
      description: data.description,
      startAt:     new Date(data.startAt),
      endAt:       new Date(data.endAt),
      color:       data.color || '#7C6FE0',
      type:        (data.type as any) || 'STUDY',
    },
  })

  if (data.syncGoogle) {
    try {
      const auth     = await getGoogleClient(userId)
      const calendar = google.calendar({ version: 'v3', auth })
      const gcEvent  = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary:     data.title,
          description: data.description,
          start: { dateTime: new Date(data.startAt).toISOString() },
          end:   { dateTime: new Date(data.endAt).toISOString() },
          colorId: '3',
        },
      })
      await prisma.calendarEvent.update({
        where: { id: event.id },
        data:  { googleEventId: gcEvent.data.id },
      })
    } catch (e) {
      console.warn('Google Calendar sync failed:', e)
    }
  }

  return event
}

export const deleteEvent = async (userId: string, eventId: string) => {
  const event = await prisma.calendarEvent.findFirst({
    where: { id: eventId, userId },
  })
  if (!event) throw new AppError('Event not found', 404)

  if (event.googleEventId) {
    try {
      const auth     = await getGoogleClient(userId)
      const calendar = google.calendar({ version: 'v3', auth })
      await calendar.events.delete({
        calendarId: 'primary',
        eventId:    event.googleEventId,
      })
    } catch {}
  }

  await prisma.calendarEvent.delete({ where: { id: eventId } })
}

export const syncFromGoogle = async (userId: string) => {
  const auth     = await getGoogleClient(userId)
  const calendar = google.calendar({ version: 'v3', auth })

  const response = await calendar.events.list({
    calendarId:   'primary',
    timeMin:      new Date().toISOString(),
    maxResults:   50,
    singleEvents: true,
    orderBy:      'startTime',
  })

  const gcEvents = response.data.items || []
  let synced = 0

  for (const gcEvent of gcEvents) {
    if (!gcEvent.start?.dateTime || !gcEvent.id) continue

    // ✅ Upsert by googleEventId (unique field), not by Prisma UUID
    await prisma.calendarEvent.upsert({
      where:  { googleEventId: gcEvent.id },
      update: {
        title:   gcEvent.summary || 'Untitled',
        startAt: new Date(gcEvent.start.dateTime),
        endAt:   new Date(gcEvent.end?.dateTime || gcEvent.start.dateTime),
      },
      create: {
        userId,
        googleEventId: gcEvent.id,
        title:   gcEvent.summary || 'Untitled',
        startAt: new Date(gcEvent.start.dateTime),
        endAt:   new Date(gcEvent.end?.dateTime || gcEvent.start.dateTime),
        type:    'PERSONAL',
        color:   '#3B82F6',
      },
    }).catch(err => console.warn('[Sync] upsert failed:', err))

    synced++
  }

  return { synced }
}
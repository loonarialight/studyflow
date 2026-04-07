import { Server, Socket } from 'socket.io'
import { Server as HttpServer } from 'http'
import { verifyAccessToken } from '../utils/jwt'
import { prisma } from '../config/database'

interface FocusUser {
  userId: string
  name: string
  tag: string
  subject?: string
  startedAt: Date
}

// In-memory focus room state
const focusRooms = new Map<string, Map<string, FocusUser>>()

export const initSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) return next(new Error('No token'))

      const payload = verifyAccessToken(token)
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, tag: true },
      })
      if (!user) return next(new Error('User not found'))

      ;(socket as any).user = user
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user
    console.log(`🔌 Socket connected: ${user.name}`)

    // ─── Group room ───────────────────────────────────────────
    socket.on('group:join', (groupId: string) => {
      socket.join(`group:${groupId}`)
      socket.to(`group:${groupId}`).emit('group:user_joined', {
        userId: user.id,
        name: user.name,
      })
    })

    socket.on('group:leave', (groupId: string) => {
      socket.leave(`group:${groupId}`)
    })

    // ─── Group Chat ───────────────────────────────────────────
    socket.on('chat:message', async (data: { groupId: string; content: string }) => {
      if (!data.content?.trim() || !data.groupId) return

      // Save to DB
      const message = await prisma.chatMessage.create({
        data: {
          groupId: data.groupId,
          senderId: user.id,
          content: data.content.trim(),
        },
        include: {
          sender: { select: { id: true, name: true, tag: true, avatar: true } },
        },
      })

      io.to(`group:${data.groupId}`).emit('chat:message', message)
    })

    // ─── Focus Session ────────────────────────────────────────
    socket.on('focus:start', (data: { groupId: string; subject?: string }) => {
      const room = `focus:${data.groupId}`
      socket.join(room)

      if (!focusRooms.has(data.groupId)) {
        focusRooms.set(data.groupId, new Map())
      }

      const focusUser: FocusUser = {
        userId: user.id,
        name: user.name,
        tag: user.tag,
        subject: data.subject,
        startedAt: new Date(),
      }

      focusRooms.get(data.groupId)!.set(user.id, focusUser)

      io.to(room).emit('focus:update', {
        type: 'joined',
        user: focusUser,
        participants: Array.from(focusRooms.get(data.groupId)!.values()),
      })
    })

    socket.on('focus:stop', (groupId: string) => {
      focusRooms.get(groupId)?.delete(user.id)

      io.to(`focus:${groupId}`).emit('focus:update', {
        type: 'left',
        userId: user.id,
        participants: Array.from(focusRooms.get(groupId)?.values() || []),
      })
    })

    // ─── Solo Focus ───────────────────────────────────────────
    socket.on('solo:heartbeat', () => {
      socket.emit('solo:ack', { timestamp: Date.now() })
    })

    // ─── Disconnect ───────────────────────────────────────────
    socket.on('disconnect', () => {
      // Clean up focus rooms
      focusRooms.forEach((room, groupId) => {
        if (room.has(user.id)) {
          room.delete(user.id)
          io.to(`focus:${groupId}`).emit('focus:update', {
            type: 'left',
            userId: user.id,
            participants: Array.from(room.values()),
          })
        }
      })
      console.log(`🔌 Disconnected: ${user.name}`)
    })
  })

  return io
}

import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import swaggerUi from 'swagger-ui-express'

import { env } from './config/env'
import { swaggerSpec } from './config/swagger'
import { errorHandler } from './middleware/errorHandler'
import { initSocket } from './socket/socket'

// Routes
import authRoutes from './modules/auth/auth.routes'
import trackingRoutes from './modules/tracking/tracking.routes'
import calendarRoutes from './modules/calendar/calendar.routes'
import analyticsRoutes from './modules/analytics/analytics.routes'
import groupsRoutes from './modules/groups/groups.routes'
import aiRoutes from './modules/ai/ai.routes'
import adminRoutes from './modules/admin/admin.routes'
import learnRoutes from './modules/learn/learn.routes'

import tasksRoutes from './modules/tasks/tasks.routes'
import goalsRoutes from './modules/goals/goals.routes'
 

const app = express()
const httpServer = createServer(app)

// ─── Socket.io ────────────────────────────────────────────────
const io = initSocket(httpServer)
app.set('io', io)

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))
app.use(morgan(env.isDev ? 'dev' : 'combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Rate Limiting ────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, try again later' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts' },
})

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'AI rate limit exceeded' },
})

app.use('/api', globalLimiter)
app.use('/api/auth', authLimiter)
app.use('/api/ai', aiLimiter)

// ─── Swagger UI ───────────────────────────────────────────────
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'StudyFlow API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
    },
  })
)
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec))

// ─── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    docs: `http://localhost:${env.PORT}/api/docs`,
  })
})

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/tracking', trackingRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/groups', groupsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/learn', learnRoutes)
app.use('/api/tasks', tasksRoutes)
app.use('/api/goals', goalsRoutes)
 

// ─── 404 ─────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    docs: `/api/docs`,
  })
})


process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message)
})
process.on('unhandledRejection', (err: any) => {
  console.error('Unhandled Rejection:', err?.message)
})
// ─── Error Handler ────────────────────────────────────────────
app.use(errorHandler)



// ─── Start Server ─────────────────────────────────────────────
httpServer.listen(env.PORT, () => {
  console.log(`\n🚀 StudyFlow API running on http://localhost:${env.PORT}`)
  console.log(`📖 Swagger docs: http://localhost:${env.PORT}/api/docs`)
  console.log(`🔌 WebSocket ready`)
  console.log(`🌍 Environment: ${env.NODE_ENV}\n`)
})

export { app, httpServer }

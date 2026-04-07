import swaggerJsdoc from 'swagger-jsdoc'
import { env } from './env'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StudyFlow API',
      version: '1.0.0',
      description: `
# StudyFlow — Learning Platform API

Educational platform with focus tracking, AI chatbot, group study and calendar sync.

## Authentication
Most endpoints require JWT Bearer token. Get token via **/api/auth/login** or **/api/auth/google**.

## Rate Limits
- Public endpoints: 100 req/15min
- Auth endpoints: 10 req/15min  
- AI Chat: 30 req/min
      `,
      contact: {
        name: 'StudyFlow Team',
        email: 'dev@studyflow.app',
      },
    },
    servers: [
      { url: `http://localhost:${env.PORT}`, description: 'Development' },
      { url: 'https://api.studyflow.app', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token from /api/auth/login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            tag: { type: 'string', example: '@student_user' },
            avatar: { type: 'string', nullable: true },
            language: { type: 'string', default: 'ru' },
            isPremium: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & authorization' },
      { name: 'Users', description: 'User profile & settings' },
      { name: 'Tracking', description: 'Study sessions & timer' },
      { name: 'Tasks', description: 'Planner & task management' },
      { name: 'Education', description: 'Lessons, tests & progress' },
      { name: 'Calendar', description: 'Events & Google Calendar sync' },
      { name: 'Groups', description: 'Study groups & chat' },
      { name: 'Analytics', description: 'Statistics & insights' },
      { name: 'AI', description: 'AI assistant (Gemini)' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.controller.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)

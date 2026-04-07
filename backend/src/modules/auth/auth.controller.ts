import { Request, Response } from 'express'
import { z } from 'zod'
import * as authService from './auth.service'
import { successResponse, errorResponse } from '../../utils/response'
import { verifyRefreshToken, signAccessToken } from '../../utils/jwt'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  tag: z.string().min(3).regex(/^@?[a-z0-9_]+$/i),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register new user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name, tag]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: student@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: securepass123
 *               name:
 *                 type: string
 *                 example: Айдар Бекович
 *               tag:
 *                 type: string
 *                 example: "@aidar_study"
 *     responses:
 *       201:
 *         description: Registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokens'
 *       409:
 *         description: Email or tag already exists
 */
export const register = async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) return errorResponse(res, 'Validation error', 422, parsed.error.errors)

  const result = await authService.registerUser({
    ...parsed.data,
    tag: parsed.data.tag.startsWith('@') ? parsed.data.tag : `@${parsed.data.tag}`,
  })
  return successResponse(res, result, 'Registered successfully', 201)
}

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: student@example.com
 *               password:
 *                 type: string
 *                 example: securepass123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokens'
 *       401:
 *         description: Invalid credentials
 */
export const login = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return errorResponse(res, 'Validation error', 422, parsed.error.errors)

  const result = await authService.loginUser(parsed.data.email, parsed.data.password)
  return successResponse(res, result, 'Login successful')
}

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Get Google OAuth redirect URL
 *     security: []
 *     responses:
 *       200:
 *         description: Google OAuth URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 */
export const googleAuth = (req: Request, res: Response) => {
  const url = authService.getGoogleAuthUrl()
  return successResponse(res, { url })
}

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth callback
 *     security: []
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect to frontend with tokens
 */
export const googleCallback = async (req: Request, res: Response) => {
  const { code } = req.query
  if (!code || typeof code !== 'string') {
    return errorResponse(res, 'Missing code', 400)
  }

  const result = await authService.handleGoogleCallback(code)
  // Redirect to frontend with tokens
  const frontendUrl = `${process.env.CLIENT_URL}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`
  return res.redirect(frontendUrl)
}

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token
 */
export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body
  if (!refreshToken) return errorResponse(res, 'No refresh token', 401)

  const payload = verifyRefreshToken(refreshToken)
  const accessToken = signAccessToken({ userId: payload.userId, email: payload.email })
  return successResponse(res, { accessToken })
}

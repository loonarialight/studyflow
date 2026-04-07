import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '../../config/database'
import { env } from '../../config/env'
import { signAccessToken, signRefreshToken } from '../../utils/jwt'
import { AppError } from '../../middleware/errorHandler'

const googleClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
)

// ─── Email/Password Auth ───────────────────────────────────────

export const registerUser = async (data: {
  email: string
  password: string
  name: string
  tag: string
}) => {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { tag: data.tag }] },
  })
  if (existing?.email === data.email) throw new AppError('Email already in use', 409)
  if (existing?.tag === data.tag) throw new AppError('Tag already taken', 409)

  const passwordHash = await bcrypt.hash(data.password, 12)

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      tag: data.tag,
      passwordHash,
      settings: { create: {} },
    },
    select: { id: true, email: true, name: true, tag: true, isPremium: true },
  })

  return generateTokens(user)
}

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user?.passwordHash) throw new AppError('Invalid credentials', 401)

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new AppError('Invalid credentials', 401)

  return generateTokens(user)
}

// ─── Google OAuth ──────────────────────────────────────────────

export const getGoogleAuthUrl = () => {
  return googleClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/calendar',
    ],
  })
}

export const handleGoogleCallback = async (code: string) => {
  const { tokens } = await googleClient.getToken(code)
  googleClient.setCredentials(tokens)

  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token!,
    audience: env.GOOGLE_CLIENT_ID,
  })
  const payload = ticket.getPayload()!
  const { sub: googleId, email, name, picture } = payload

  // Generate unique tag from name
  const baseTag = `@${(name || email!.split('@')[0])
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')}`
  const tag = `${baseTag}_${Math.floor(Math.random() * 9999)}`

  const user = await prisma.user.upsert({
    where: { googleId: googleId! },
    update: {
      googleTokens: tokens as any,
      avatar: picture,
      name: name || '',
    },
    create: {
      email: email!,
      name: name || '',
      tag,
      googleId: googleId!,
      googleTokens: tokens as any,
      avatar: picture,
      isVerified: true,
      settings: { create: {} },
    },
  })

  return generateTokens(user)
}

// ─── Helpers ──────────────────────────────────────────────────

const generateTokens = (user: { id: string; email: string; name: string; isPremium: boolean }) => {
  const payload = { userId: user.id, email: user.email }
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: { id: user.id, email: user.email, name: user.name, isPremium: user.isPremium },
  }
}

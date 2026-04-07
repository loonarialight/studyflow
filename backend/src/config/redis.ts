import Redis from 'ioredis'
import { env } from './env'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
})

redis.on('connect', () => console.log('✅ Redis connected'))
redis.on('error', (err) => console.error('❌ Redis error:', err))

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const data = await redis.get(key)
  return data ? JSON.parse(data) : null
}

export const cacheSet = async (key: string, value: unknown, ttlSeconds = 300) => {
  await redis.setex(key, ttlSeconds, JSON.stringify(value))
}

export const cacheDel = async (key: string) => {
  await redis.del(key)
}

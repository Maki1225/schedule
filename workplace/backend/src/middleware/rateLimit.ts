import type { Context } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'
import type { Store } from 'hono-rate-limiter'
import { sql } from '../config/db'
import type { Env } from '../types/hono'

function createSqlStore(name: string, windowMs: number): Store<Env> {
  const bucketKey = (key: string) => `${name}:${key}`

  return {
    prefix: name,
    async get(key) {
      const [row] = await sql`
        SELECT hits, reset_at
        FROM api_rate_limit_buckets
        WHERE bucket_key = ${bucketKey(key)}
      `
      return row
        ? { totalHits: Number(row.hits), resetTime: new Date(row.reset_at) }
        : undefined
    },
    async increment(key) {
      const [row] = await sql`
        WITH expired AS (
          DELETE FROM api_rate_limit_buckets
          WHERE reset_at <= now()
        )
        INSERT INTO api_rate_limit_buckets (bucket_key, hits, reset_at)
        VALUES (
          ${bucketKey(key)},
          1,
          now() + (${windowMs} * interval '1 millisecond')
        )
        ON CONFLICT (bucket_key) DO UPDATE
        SET
          hits = CASE
            WHEN api_rate_limit_buckets.reset_at <= now() THEN 1
            ELSE api_rate_limit_buckets.hits + 1
          END,
          reset_at = CASE
            WHEN api_rate_limit_buckets.reset_at <= now() THEN EXCLUDED.reset_at
            ELSE api_rate_limit_buckets.reset_at
          END
        RETURNING hits, reset_at
      `
      return { totalHits: Number(row.hits), resetTime: new Date(row.reset_at) }
    },
    async decrement(key) {
      await sql`
        UPDATE api_rate_limit_buckets
        SET hits = GREATEST(hits - 1, 0)
        WHERE bucket_key = ${bucketKey(key)}
      `
    },
    async resetKey(key) {
      await sql`
        DELETE FROM api_rate_limit_buckets
        WHERE bucket_key = ${bucketKey(key)}
      `
    },
    localKeys: false,
  }
}

function getClientAddress(c: Context<Env>): string {
  const realIp = c.req.header('x-real-ip')?.trim()
  if (realIp) return realIp

  const forwardedFor = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor || 'unknown'
}

export function createRequestRateLimiter(
  name: string,
  limit: number,
  windowMs: number,
  store: Store<Env> = createSqlStore(name, windowMs)
) {
  return rateLimiter<Env>({
    windowMs,
    limit,
    store,
    keyGenerator: (c) => getClientAddress(c),
    statusCode: 429,
    standardHeaders: 'draft-7',
    message: { error: 'リクエスト数が上限を超えました。しばらくしてから再試行してください。' },
  })
}

export const googleAuthRateLimit = createRequestRateLimiter('google-auth', 20, 15 * 60 * 1000)
export const demoSessionRateLimit = createRequestRateLimiter('demo-session', 30, 15 * 60 * 1000)
export const inviteCodeRateLimit = createRequestRateLimiter('invite-code', 30, 15 * 60 * 1000)
export const apiWriteRateLimit = createRequestRateLimiter('api-write', 100, 60 * 1000)

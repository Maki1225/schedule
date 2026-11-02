import type { MiddlewareHandler } from 'hono'

const productionAllowedOrigins = ['https://schedule-sai.vercel.app']
const developmentAllowedOrigins = [
  ...productionAllowedOrigins,
  'http://127.0.0.1:8765',
  'http://localhost:8765',
]
const stateChangingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function getAllowedOrigins(environment = process.env.NODE_ENV): string[] {
  return environment === 'production'
    ? [...productionAllowedOrigins]
    : [...developmentAllowedOrigins]
}

export function createOriginGuard(allowedOrigins: readonly string[]): MiddlewareHandler {
  return async (c, next) => {
    const origin = c.req.header('Origin')
    
    // Reject missing Origin for state-changing methods (security best practice)
    if (stateChangingMethods.has(c.req.method) && !origin) {
      return c.json({ error: '許可されていないOriginからのリクエストです' }, 403)
    }
    
    if (origin) {
      if (!allowedOrigins.includes(origin)) {
        return c.json({ error: '許可されていないOriginからのリクエストです' }, 403)
      }
    }
    
    await next()
  }
}

// Content-Type検証：text/plain や multipart/form-data など非JSONリクエストを拒否
export const requireJsonContentType: MiddlewareHandler = async (c, next) => {
  const contentType = c.req.header('Content-Type')

  // Content-Typeヘッダーがない場合はスキップ（各ハンドラで個別に処理）
  if (!contentType) {
    await next()
    return
  }

  const parsedContentType = contentType.split(';', 1)[0].trim().toLowerCase()

  if (parsedContentType !== 'application/json') {
    return c.json({ error: 'Content-Typeはapplication/jsonである必要があります' }, 415)
  }

  await next()
}

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
    if (
      stateChangingMethods.has(c.req.method) &&
      !allowedOrigins.includes(c.req.header('Origin') ?? '')
    ) {
      return c.json({ error: '許可されていないOriginからのリクエストです' }, 403)
    }

    await next()
  }
}

export const requireJsonContentType: MiddlewareHandler = async (c, next) => {
  const contentType = c.req.header('Content-Type')
    ?.split(';', 1)[0]
    .trim()
    .toLowerCase()

  if (contentType !== 'application/json') {
    return c.json({ error: 'Content-Typeはapplication/jsonである必要があります' }, 415)
  }

  await next()
}

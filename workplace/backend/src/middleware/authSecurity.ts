import type { MiddlewareHandler } from 'hono'

import { createOriginGuard, requireJsonContentType } from './requestSecurity'

const productionAllowedOrigins = ['https://schedule-sai.vercel.app']

export const requireLoginOriginGuard: MiddlewareHandler = async (c, next) => {
  const origin = c.req.header('Origin')
  if (origin && !productionAllowedOrigins.includes(origin)) {
    return c.json({ error: '許可されていないOriginからのリクエストです' }, 403)
  }
  await next()
}

export const requireLoginContentType: MiddlewareHandler = async (c, next) => {
  const contentType = c.req.header('Content-Type')
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

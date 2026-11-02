import type { MiddlewareHandler } from 'hono'
import type { Env } from '../types/hono'

/** body size limit in bytes (1MB default) */
export const MAX_BODY_SIZE = 1 * 1024 * 1024 // 1MB

export function bodySizeLimit(limit = MAX_BODY_SIZE): MiddlewareHandler<Env> {
  return async (c, next) => {
    const contentLength = c.req.header('Content-Length')
    if (contentLength) {
      const cl = parseInt(contentLength, 10)
      if (cl > limit) {
        return c.json(
          { error: 'リクエストボディが大きすぎます' },
          413
        )
      }
    }

    await next()
  }
}

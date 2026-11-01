import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'
import { Env, JWTPayload } from '../types/hono'

export const authCheck = async (c: Context<Env>, next: Next) => {
  const authorization = c.req.header('Authorization')
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined
  const token = bearerToken || getCookie(c, 'token')

  if (!token) {
    // 400 から 401 に変更
    return c.json({ error: '認証トークンがありません' }, 401)
  }

  try {
    // 2. JWT の検証
    const secret = process.env.JWT_SECRET || 'your-secret-key'
    const payload = await verify(token, secret, 'HS256')
    if (
      (typeof payload.id !== 'string' && typeof payload.id !== 'number') ||
      typeof payload.email !== 'string' ||
      typeof payload.exp !== 'number' ||
      (payload.mode !== undefined && payload.mode !== 'demo') ||
      (payload.persona !== undefined && typeof payload.persona !== 'string')
    ) {
      return c.json({ error: '無効なトークンです' }, 401)
    }

    const jwtPayload: JWTPayload = {
      id: payload.id,
      email: payload.email,
      exp: payload.exp,
      ...(payload.mode === 'demo' ? { mode: 'demo' as const } : {}),
      ...(typeof payload.persona === 'string' ? { persona: payload.persona } : {}),
    }
    c.set('jwtPayload', jwtPayload)

    await next()
  } catch (err) {
    console.error('JWT検証エラー:', err)
    return c.json({ error: '無効なトークンです' }, 401)
  }
}

export const rejectDemoAccess = async (c: Context<Env>, next: Next) => {
  const payload = c.get('jwtPayload')
  if (payload?.mode === 'demo') {
    return c.json({ error: 'デモモードでは既存データを変更できません。' }, 403)
  }
  await next()
}
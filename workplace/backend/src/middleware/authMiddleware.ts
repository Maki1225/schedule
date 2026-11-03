import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'
import { Env, JWTPayload } from '../types/hono'
import { UserModel } from '../models/userModel'
import { getJwtSecret } from '../controllers/authController'

type TokenVersionLookup = (id: string | number) => Promise<number | null>

export function createAuthCheck(
  getTokenVersion: TokenVersionLookup = UserModel.getTokenVersion
) {
  return async (c: Context<Env>, next: Next) => {
    const authorization = c.req.header('Authorization')
    const bearerToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined
    const token = bearerToken || getCookie(c, 'token')

    if (!token) {
      return c.json({ error: '認証トークンがありません' }, 401)
    }

    // JWT_SECRET バリデーションがパスした秘密鍵を使用
    const secret = getJwtSecret()

    let payload: Awaited<ReturnType<typeof verify>>
    try {
      payload = await verify(token, secret, 'HS256')
    } catch (error) {
      console.error('JWT検証エラー:', error)
      return c.json({ error: '無効なトークンです' }, 401)
    }

    if (
      (typeof payload.id !== 'string' && typeof payload.id !== 'number') ||
      typeof payload.email !== 'string' ||
      typeof payload.exp !== 'number' ||
      (payload.mode !== 'demo' &&
        (typeof payload.token_version !== 'number' ||
          !Number.isSafeInteger(payload.token_version) ||
          payload.token_version < 0)) ||
      (payload.mode !== undefined && payload.mode !== 'demo') ||
      (payload.persona !== undefined && typeof payload.persona !== 'string')
    ) {
      return c.json({ error: '無効なトークンです' }, 401)
    }

    if (payload.mode !== 'demo') {
      const currentTokenVersion = await getTokenVersion(payload.id)
      if (currentTokenVersion === null || payload.token_version !== currentTokenVersion) {
        return c.json({ error: '無効なトークンです' }, 401)
      }
    }

    const jwtPayload: JWTPayload = {
      id: payload.id,
      email: payload.email,
      exp: payload.exp,
      ...(typeof payload.token_version === 'number'
        ? { tokenVersion: payload.token_version }
        : {}),
      ...(payload.mode === 'demo' ? { mode: 'demo' as const } : {}),
      ...(typeof payload.persona === 'string' ? { persona: payload.persona } : {}),
    }
    c.set('jwtPayload', jwtPayload)

    await next()
  }
}

export const authCheck = createAuthCheck()

export const rejectDemoAccess = async (c: Context<Env>, next: Next) => {
  const payload = c.get('jwtPayload')
  if (payload?.mode === 'demo') {
    return c.json({ error: 'デモモードでは既存データを変更できません。' }, 403)
  }
  await next()
}

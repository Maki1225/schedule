import { Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'
import { AppContext, JWTPayload } from '../types/hono'
import { getJwtSecret } from '../config/env'

export const authCheck = async (c: AppContext, next: Next) => {
  // 1. Cookie または Authorization ヘッダー(Bearer)から token を取得
  const bearer = c.req.header('Authorization')?.match(/^Bearer (.+)$/)?.[1]
  const token = getCookie(c, 'token') || bearer

  if (!token) {
    return c.json({ error: '認証トークンがありません' }, 401)
  }

  try {
    // 2. JWT の検証（アルゴリズムは HS256 に固定、弱いデフォルトシークレットは使わない）
    const payload = (await verify(token, getJwtSecret(), 'HS256')) as unknown as JWTPayload

    // コンテキストにユーザー情報を保存
    c.set('jwtPayload', payload)

    await next()
  } catch (err) {
    console.error('JWT検証エラー:', err)
    return c.json({ error: '無効なトークンです' }, 401)
  }
}
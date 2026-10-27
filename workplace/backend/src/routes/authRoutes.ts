import { Hono } from 'hono'
import { Env } from '../types/hono'
import { AuthController } from '../controllers/authController'
import { authCheck } from '../middleware/authMiddleware'

export const authRoutes = new Hono<Env>()

// Google 認可コード (code) によるログイン
authRoutes.post('/google', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const code = body.code

  if (!code) {
    return c.json({ error: '認可コード (code) が必要です' }, 400)
  }

  // AuthController の設計に合わせて `c`（Context）のみを渡す
  return AuthController.googleLogin(c)
})

// ログイン中のユーザー情報取得
authRoutes.get('/me', authCheck, (c) => AuthController.getMe(c))

// ログアウト
authRoutes.post('/logout', (c) => AuthController.logout(c))

export default authRoutes
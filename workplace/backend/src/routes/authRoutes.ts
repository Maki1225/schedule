import { Hono } from 'hono'
import { Env } from '../types/hono'
import { AuthController } from '../controllers/authController'
import { authCheck, rejectDemoAccess } from '../middleware/authMiddleware'
import { requireJsonContentType } from '../middleware/requestSecurity'
import { googleAuthRateLimit } from '../middleware/rateLimit'
import { requireLoginOriginGuard } from '../middleware/authSecurity'

export const authRoutes = new Hono<Env>()

// Google 認可コード (code) によるログイン
authRoutes.post(
  '/google',
  googleAuthRateLimit,
  requireLoginOriginGuard,
  requireJsonContentType,
  async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const code = body.code

    if (!code) {
      return c.json({ error: '認可コード (code) が必要です' }, 400)
    }

    // AuthController の設計に合わせて `c`（Context）のみを渡す
    return AuthController.googleLogin(c)
  }
)

// ログイン中のユーザー情報取得
authRoutes.get('/me', authCheck, (c) => AuthController.getMe(c))

// プロフィールのニックネーム更新
authRoutes.patch(
  '/me',
  requireLoginOriginGuard,
  requireJsonContentType,
  authCheck,
  rejectDemoAccess,
  async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!name || name.length > 50) {
      return c.json({ error: 'ニックネームは1〜50文字で入力してください' }, 400)
    }

    return AuthController.updateMe(c, name)
  }
)

// 会員登録の削除
authRoutes.delete(
  '/me',
  requireLoginOriginGuard,
  authCheck,
  rejectDemoAccess,
  (c) => AuthController.deleteMe(c)
)

// ログアウト
authRoutes.post(
  '/logout',
  requireLoginOriginGuard,
  authCheck,
  rejectDemoAccess,
  (c) => AuthController.logout(c)
)

export default authRoutes

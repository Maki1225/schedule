import { Hono } from 'hono'
import { Env } from '../types/hono'
import { AuthController } from '../controllers/authController'
import { authCheck } from '../middleware/authMiddleware'

export const authRoutes = new Hono<Env>()

// Google 認可コード (code) によるログイン
authRoutes.post('/google', (c) => AuthController.googleLogin(c))

// ログイン中のユーザー情報取得
authRoutes.get('/me', authCheck, (c) => AuthController.getMe(c))

// ログアウト
authRoutes.post('/logout', (c) => AuthController.logout(c))

export default authRoutes
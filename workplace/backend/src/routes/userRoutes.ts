import { Hono } from 'hono'
import { Env } from '../types/hono'
import { userController } from '../controllers/userController'
import { authCheck } from '../middleware/authMiddleware'

const userRoutes = new Hono<Env>()

// すべてのプロフィール関連ルートに認証ミドルウェアを適用
userRoutes.use('*', authCheck)

// GET /api/users/me - 自分のプロフィール情報取得
userRoutes.get('/me', userController.getProfile)

// PUT /api/users/me - プロフィール情報更新
userRoutes.put('/me', userController.updateProfile)

export default userRoutes
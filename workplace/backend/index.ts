import 'dotenv/config'
import { Hono, Context } from 'hono'
import { serve } from '@hono/node-server'
import { secureHeaders, cors, rateLimiter } from './src/middleware'
import { getAllowedOrigins, getJwtSecret, isProduction } from './src/config/env'
import { Env } from './src/types/hono'
import eventRoutes from './src/routes/eventRoutes'
import authRoutes from './src/routes/authRoutes'
import groupRoutes from './src/routes/groupRoutes'
import userRoutes from './src/routes/userRoutes'

// 起動時に JWT_SECRET の未設定・短すぎる値を検知して即失敗させる
getJwtSecret()

const app = new Hono<Env>()

// 1. セキュリティヘッダー
// Google ポップアップ認証のため COOP は same-origin-allow-popups を使用
app.use(
  '*',
  secureHeaders({
    crossOriginOpenerPolicy: 'same-origin-allow-popups',
  })
)

// 2. CORS設定（許可リストに完全一致したオリジンのみ許可。*.vercel.app のワイルドカードは廃止）
const allowedOrigins = getAllowedOrigins()
app.use(
  '/api/*',
  cors({
    origin: (origin) => (origin && allowedOrigins.includes(origin) ? origin : null),
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

// 3. レート制限
const clientKey = (c: Context) =>
  c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
  c.req.header('x-real-ip') ||
  'unknown'

// API 全体: 1分あたり100リクエスト
app.use(
  '/api/*',
  rateLimiter({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-6',
    keyGenerator: clientKey,
    message: { error: 'リクエストが多すぎます。しばらくしてから再度お試しください' },
  })
)

// 認証系: 15分あたり20リクエスト（総当たり対策）
app.use(
  '/api/auth/google',
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-6',
    keyGenerator: clientKey,
    message: { error: '認証リクエストが多すぎます。しばらくしてから再度お試しください' },
  })
)

// 4. エラーハンドラ（内部エラーの詳細はクライアントへ返さない）
app.onError((err, c) => {
  console.error('★ サーバーエラー詳細:', err)
  return c.json(
    {
      error: 'サーバー内部エラーが発生しました',
      ...(isProduction() ? {} : { message: err.message }),
    },
    500
  )
})

// 5. APIルートの登録
app.route('/api/events', eventRoutes)
app.route('/api/auth', authRoutes)
app.route('/api/groups', groupRoutes)
app.route('/api/users', userRoutes)

// 6. ローカル開発用サーバー起動
if (process.env.NODE_ENV !== 'production') {
  const port = Number(process.env.PORT) || 5000
  serve(
    {
      fetch: app.fetch,
      port,
      hostname: '0.0.0.0',
    },
    (info) => {
      console.log(`開発用サーバー起動: http://localhost:${info.port}`)
    }
  )
}

// Vercel Serverless Functions 用 (fetch をそのままエクスポート)
export const GET = app.fetch
export const POST = app.fetch
export const PUT = app.fetch
export const DELETE = app.fetch
export const PATCH = app.fetch
export const OPTIONS = app.fetch

export default app
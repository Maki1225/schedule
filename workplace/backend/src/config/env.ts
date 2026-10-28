// JWT 署名用シークレット（未設定時は起動/リクエストを失敗させる。弱いデフォルト値は使わない）
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set or too short (min 32 chars).')
  }
  return secret
}

export const isProduction = (): boolean => process.env.NODE_ENV === 'production'

// CORS で許可するオリジン一覧
export const getAllowedOrigins = (): string[] => {
  const origins = [
    'https://schedule-sai.vercel.app',
    'https://schedule-backend-navy.vercel.app',
  ]
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL.replace(/\/$/, ''))
  }
  if (!isProduction()) {
    origins.push(
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'http://127.0.0.1:5000',
      'http://localhost:5000'
    )
  }
  return [...new Set(origins)]
}

import { Context } from 'hono'

export interface User {
  id: string | number
  name: string
  email: string
  picture?: string
}

// JWT の Payload 型
export interface JWTPayload {
  id: string | number
  email: string
  exp: number
}

// Hono の Context に持たせるカスタム変数の型定義
export type Env = {
  Variables: {
    jwtPayload: JWTPayload
    user: User | null
    groupRole?: string // 追加
  }
}

// アプリ全体で使い回す Context 型
export type AppContext = Context<Env>
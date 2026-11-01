import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'
import { AppContext, JWTPayload } from '../types/hono'
import { getJwtSecret } from './authController'
import { UserModel } from '../models/userModel'
import { sql } from '../config/db'

const demoCookie = 'demo_token'
const demoLifetimeSeconds = 30 * 60

const personas = {
  'many-tasks': {
    name: '課題が多い人',
    email: 'minami.kosen.demo@gmail.com',
  },
  'many-schedules': {
    name: '予定が多い人',
    email: 'aoi108.demo@gmail.com',
  },
  'shared-schedules': {
    name: '共有予定が多い人',
    email: 'haruhi.kosen.demo@gmail.com',
  },
} as const

type PersonaId = keyof typeof personas

function isPersonaId(value: unknown): value is PersonaId {
  return typeof value === 'string' && Object.hasOwn(personas, value)
}

async function getDemoPayload(c: AppContext): Promise<(JWTPayload & { persona: PersonaId }) | null> {
  const authorization = c.req.header('Authorization')
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined
  const token = bearerToken || getCookie(c, demoCookie)
  if (!token) return null

  try {
    const payload = await verify(token, getJwtSecret(), 'HS256')
    if (
      payload.mode !== 'demo' ||
      !isPersonaId(payload.persona) ||
      (typeof payload.id !== 'string' && typeof payload.id !== 'number') ||
      typeof payload.email !== 'string' ||
      typeof payload.exp !== 'number'
    ) {
      return null
    }
    return {
      id: payload.id,
      email: payload.email,
      exp: payload.exp,
      mode: 'demo',
      persona: payload.persona,
    }
  } catch (error) {
    console.error('デモトークンの検証に失敗しました:', error)
    return null
  }
}

export const DemoController = {
  async createSession(c: AppContext) {
    const body: unknown = await c.req.json().catch(() => ({}))
    const personaId =
      typeof body === 'object' && body !== null && 'personaId' in body
        ? body.personaId
        : undefined
    if (!isPersonaId(personaId)) {
      return c.json({ error: '選択されたデモプロフィールは利用できません。' }, 400)
    }

    const persona = personas[personaId]
    const user = await UserModel.findByEmail(persona.email)
    if (!user) {
      return c.json({ error: 'このデモアカウントはまだ利用できません。' }, 404)
    }

    const token = await sign(
      {
        id: user.id,
        email: user.email,
        mode: 'demo',
        persona: personaId,
        exp: Math.floor(Date.now() / 1000) + demoLifetimeSeconds,
      },
      getJwtSecret()
    )

    setCookie(c, demoCookie, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/',
      maxAge: demoLifetimeSeconds,
    })
    c.header('Cache-Control', 'no-store')
    return c.json({
      message: 'デモを開始しました',
      sessionToken: token,
      user: { name: persona.name },
    })
  },

  async getSession(c: AppContext) {
    const payload = await getDemoPayload(c)
    if (!payload || !isPersonaId(payload.persona)) {
      return c.json({ error: 'デモセッションがありません。' }, 401)
    }

    const persona = personas[payload.persona]
    const user = await UserModel.findById(payload.id)
    if (!user || user.email !== persona.email) {
      return c.json({ error: 'デモアカウントが見つかりません。' }, 401)
    }
    const groups = await sql`
      SELECT g.id, g.name, gm.role
      FROM groups g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE gm.user_id = ${user.id}
      ORDER BY g.id DESC
    `
    const events = await sql`
      SELECT e.*, g.name AS group_name, u.name AS creator_name
      FROM events e
      JOIN groups g ON g.id = e.group_id
      JOIN group_members gm ON gm.group_id = g.id
      LEFT JOIN users u ON u.id = e.created_by
      WHERE gm.user_id = ${user.id}
      ORDER BY e.start_time ASC
    `

    c.header('Cache-Control', 'no-store')
    return c.json({
      user: {
        id: user.id,
        name: user.name || persona.name,
        email: user.email,
      },
      groups,
      events,
    })
  },

  endSession(c: AppContext) {
    deleteCookie(c, demoCookie, {
      path: '/',
      secure: true,
      sameSite: 'None',
    })
    c.header('Cache-Control', 'no-store')
    return c.json({ message: 'デモを終了しました。' })
  },
}

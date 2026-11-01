import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'
import { AppContext } from '../types/hono'
import { getJwtSecret } from './authController'

const demoCookie = 'demo_token'
const demoLifetimeSeconds = 30 * 60

const personas = {
  'many-tasks': {
    name: '課題が多い人',
    email: 'demo-tasks@example.invalid',
    groupNames: ['高校1年A組'],
    tasks: [
      ['数学ワーク p.42-48', 1, '高'],
      ['英語スピーチ原稿', 2, '高'],
      ['理科実験レポート', 3, '中'],
      ['歴史の調べ学習', 5, '中'],
      ['国語読書感想文', 7, '低'],
    ],
    schedules: [
      ['数学の補習', 1, 16, '高校1年A組'],
      ['英語スピーキング練習', 2, 15, '高校1年A組'],
    ],
  },
  'many-schedules': {
    name: '予定が多い人',
    email: 'demo-schedules@example.invalid',
    groupNames: ['高校2年B組'],
    tasks: [
      ['化学の小テスト対策', 2, '中'],
      ['現代文の課題', 6, '低'],
    ],
    schedules: [
      ['バスケットボール部', 0, 17, '高校2年B組'],
      ['英会話レッスン', 1, 18, '高校2年B組'],
      ['委員会ミーティング', 2, 16, '高校2年B組'],
      ['ピアノレッスン', 3, 19, '高校2年B組'],
      ['部活動の練習試合', 4, 14, '高校2年B組'],
      ['友人との勉強会', 5, 15, '高校2年B組'],
      ['家族の予定', 6, 10, '高校2年B組'],
    ],
  },
  'shared-schedules': {
    name: '共有予定が多い人',
    email: 'demo-shared@example.invalid',
    groupNames: ['高校3年C組', '文化祭実行委員会'],
    tasks: [
      ['文化祭ポスター提出', 3, '高'],
      ['進路希望調査', 5, '中'],
    ],
    schedules: [
      ['クラス全体会議', 0, 16, '高校3年C組'],
      ['文化祭準備', 1, 15, '文化祭実行委員会'],
      ['進路説明会', 2, 14, '高校3年C組'],
      ['文化祭の備品確認', 3, 16, '文化祭実行委員会'],
      ['クラス写真撮影', 4, 13, '高校3年C組'],
      ['文化祭リハーサル', 5, 10, '文化祭実行委員会'],
    ],
  },
} as const

type PersonaId = keyof typeof personas

function isPersonaId(value: unknown): value is PersonaId {
  return typeof value === 'string' && Object.hasOwn(personas, value)
}

function dateAt(offsetDays: number, hour: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

function eventsForPersona(personaId: PersonaId) {
  const persona = personas[personaId]
  const userId = `demo:${personaId}`
  const tasks = persona.tasks.map(([title, dayOffset, priority], index) => ({
    id: `sample-task-${index + 1}`,
    group_id: 1,
    group_name: persona.groupNames[0],
    created_by: index % 2 === 0 ? userId : 'demo:member',
    creator_name: index % 2 === 0 ? persona.name : 'クラスメイト',
    title,
    description: `[課題] 優先度:${priority}`,
    start_time: dateAt(dayOffset - 2, 9),
    end_time: dateAt(dayOffset, 23),
    is_demo_sample: true,
  }))
  const schedules = persona.schedules.map(([title, dayOffset, hour, groupName], index) => ({
    id: `sample-schedule-${index + 1}`,
    group_id: index % 2 === 0 ? 1 : 2,
    group_name: groupName,
    created_by: index % 2 === 0 ? 'demo:member' : userId,
    creator_name: index % 2 === 0 ? 'クラスメイト' : persona.name,
    title,
    description: '[予定] みんなで共有している予定',
    start_time: dateAt(dayOffset, hour),
    end_time: dateAt(dayOffset, hour + 1),
    is_demo_sample: true,
  }))

  return [...tasks, ...schedules]
}

async function getDemoPayload(c: AppContext) {
  const authorization = c.req.header('Authorization')
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined
  const token = bearerToken || getCookie(c, demoCookie)
  if (!token) return null

  try {
    const payload = await verify(token, getJwtSecret(), 'HS256')
    if (payload.mode !== 'demo' || !isPersonaId(payload.persona)) return null
    return payload
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
    const token = await sign(
      {
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
    c.header('Cache-Control', 'no-store')
    return c.json({
      user: {
        id: `demo:${payload.persona}`,
        name: persona.name,
        email: persona.email,
      },
      groups: persona.groupNames,
      events: eventsForPersona(payload.persona),
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

import { Context } from 'hono'
import { sql } from '../config/db'
import { Env } from '../types/hono'

function getGroupId(c: Context<Env>): number | null {
  const groupId = Number(c.req.param('id'))
  return Number.isSafeInteger(groupId) && groupId > 0 ? groupId : null
}

async function hasMembership(groupId: number, userId: string | number): Promise<boolean> {
  const [membership] = await sql`
    SELECT 1
    FROM group_members
    WHERE group_id = ${groupId} AND user_id = ${userId}
  `
  return Boolean(membership)
}

export const GroupChatController = {
  async list(c: Context<Env>) {
    const groupId = getGroupId(c)
    if (!groupId) return c.json({ error: 'グループIDが不正です' }, 400)

    const userId = c.get('jwtPayload').id
    if (!(await hasMembership(groupId, userId))) {
      return c.json({ error: 'このグループのチャットを閲覧する権限がありません' }, 403)
    }

    const afterId = c.req.query('afterId')
    if (afterId !== undefined && (!/^\d+$/.test(afterId) || !Number.isSafeInteger(Number(afterId)))) {
      return c.json({ error: 'メッセージIDが不正です' }, 400)
    }

    const messages = afterId === undefined
      ? await sql`
          SELECT id, group_id, sender_id, sender_name, body, message_type, created_at
          FROM (
            SELECT
              m.id, m.group_id, m.sender_id, u.name AS sender_name,
              m.body, m.message_type, m.created_at
            FROM group_chat_messages m
            JOIN users u ON u.id = m.sender_id
            WHERE m.group_id = ${groupId}
            ORDER BY m.id DESC
            LIMIT 100
          ) recent_messages
          ORDER BY id ASC
        `
      : await sql`
          SELECT m.id, m.group_id, m.sender_id, u.name AS sender_name,
            m.body, m.message_type, m.created_at
          FROM group_chat_messages m
          JOIN users u ON u.id = m.sender_id
          WHERE m.group_id = ${groupId} AND m.id > ${Number(afterId)}
          ORDER BY m.id ASC
          LIMIT 100
        `

    c.header('Cache-Control', 'no-store')
    return c.json({ messages })
  },

  async create(c: Context<Env>) {
    const groupId = getGroupId(c)
    if (!groupId) return c.json({ error: 'グループIDが不正です' }, 400)

    const userId = c.get('jwtPayload').id
    if (!(await hasMembership(groupId, userId))) {
      return c.json({ error: 'このグループにメッセージを送信する権限がありません' }, 403)
    }

    const body: unknown = await c.req.json().catch(() => ({}))
    const text = typeof body === 'object' && body !== null && 'body' in body &&
      typeof body.body === 'string'
      ? body.body.trim()
      : ''
    if (!text || text.length > 500) {
      return c.json({ error: 'メッセージは1〜500文字で入力してください' }, 400)
    }

    const [message] = await sql`
      INSERT INTO group_chat_messages (group_id, sender_id, body, message_type)
      VALUES (${groupId}, ${userId}, ${text}, 'message')
      RETURNING id, group_id, sender_id, body, message_type, created_at
    `
    const [sender] = await sql`SELECT name AS sender_name FROM users WHERE id = ${userId}`

    c.header('Cache-Control', 'no-store')
    return c.json({ message: { ...message, sender_name: sender?.sender_name || 'メンバー' } }, 201)
  },
}

<<<<<<< HEAD

import { Context } from 'hono'
import { sql } from '../config/db'
import { Env } from '../types/hono'
import { randomBytes } from 'node:crypto'

function getUserId(c: Context<Env>) {
  return c.get('jwtPayload').id
}

function makeInviteCode() {
  return randomBytes(4).toString('hex').toUpperCase()
}

export const GroupController = {
  // グループ一覧
  async list(c: Context<Env>) {
    const userId = getUserId(c)

    const groups = await sql`
      SELECT g.id, g.name, g.invite_code, gm.role
      FROM groups g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE gm.user_id = ${userId}
      ORDER BY g.id DESC
    `

    return c.json({ groups })
  },

  // グループ作成
  async create(c: Context<Env>) {
    const userId = getUserId(c)
    const body = await c.req.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!name || name.length > 50) {
      return c.json(
        { error: 'グループ名は1〜50文字で入力してください' },
        400
      )
    }

    const inviteCode = makeInviteCode()

    const created = await sql`
      INSERT INTO groups (name, invite_code, created_by)
      VALUES (${name}, ${inviteCode}, ${userId})
      RETURNING id, name, invite_code
    `

    const group = created[0]

    await sql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${group.id}, ${userId}, 'admin')
      ON CONFLICT (group_id, user_id) DO NOTHING
    `

    return c.json({ group }, 201)
  },

  // グループ詳細とメンバー一覧
  async detail(c: Context<Env>) {
    const userId = getUserId(c)
    const groupId = Number(c.req.param('id'))

    if (!Number.isInteger(groupId) || groupId <= 0) {
      return c.json({ error: 'グループIDが不正です' }, 400)
    }

    const access = await sql`
      SELECT role FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `

    if (access.length === 0) {
      return c.json({ error: 'このグループに参加していません' }, 403)
    }

    const result = await sql`
      SELECT id, name, invite_code, created_by
      FROM groups
      WHERE id = ${groupId}
    `

    if (result.length === 0) {
      return c.json({ error: 'グループが見つかりません' }, 404)
    }

    const members = await sql`
      SELECT u.id, u.name, u.email, gm.role
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ${groupId}
      ORDER BY gm.role, u.name
    `

    return c.json({
      group: result[0],
      members
    })
  },

  // 招待コードで参加
  async join(c: Context<Env>) {
    const userId = getUserId(c)
    const body = await c.req.json().catch(() => ({}))
    const inviteCode =
      typeof body.inviteCode === 'string'
        ? body.inviteCode.trim().toUpperCase()
        : ''

    if (!inviteCode) {
      return c.json({ error: '招待コードを入力してください' }, 400)
    }

    const found = await sql`
      SELECT id, name FROM groups
      WHERE invite_code = ${inviteCode}
    `

    if (found.length === 0) {
      return c.json({ error: '招待コードが見つかりません' }, 404)
    }

    const group = found[0]

    await sql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${group.id}, ${userId}, 'member')
      ON CONFLICT (group_id, user_id) DO NOTHING
    `

    return c.json({ message: 'グループに参加しました', group })
  },

  // グループの共有イベント一覧
  async listEvents(c: Context<Env>) {
    const userId = getUserId(c)
    const groupId = Number(c.req.param('id'))

    if (!Number.isInteger(groupId) || groupId <= 0) {
      return c.json({ error: 'グループIDが不正です' }, 400)
    }

    const access = await sql`
      SELECT 1 FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `

    if (access.length === 0) {
      return c.json({ error: 'このグループに参加していません' }, 403)
    }

    const events = await sql`
      SELECT *
      FROM events
      WHERE group_id = ${groupId}
      ORDER BY start_time ASC
    `

    return c.json({ events })
  },

  // グループの共有イベント作成
  async createEvent(c: Context<Env>) {
    const userId = getUserId(c)
    const groupId = Number(c.req.param('id'))
    const body = await c.req.json().catch(() => ({}))

    if (!Number.isInteger(groupId) || groupId <= 0) {
      return c.json({ error: 'グループIDが不正です' }, 400)
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const startTime = body.start_time
    const endTime = body.end_time

    if (
      !title ||
      typeof startTime !== 'string' ||
      typeof endTime !== 'string' ||
      !Number.isFinite(Date.parse(startTime)) ||
      !Number.isFinite(Date.parse(endTime)) ||
      Date.parse(endTime) <= Date.parse(startTime)
    ) {
      return c.json(
        { error: 'タイトルと正しい開始・終了時刻を入力してください' },
        400
      )
    }

    const access = await sql`
      SELECT 1 FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `

    if (access.length === 0) {
      return c.json({ error: 'このグループに参加していません' }, 403)
    }

    const created = await sql`
      INSERT INTO events (
        group_id, created_by, title, description,
        start_time, end_time, subject, subject_color
      )
      VALUES (
        ${groupId},
        ${userId},
        ${title},
        ${typeof body.description === 'string' ? body.description : null},
        ${startTime},
        ${endTime},
        ${typeof body.subject === 'string' ? body.subject : null},
        ${typeof body.subject_color === 'string' ? body.subject_color : null}
      )
      RETURNING *
    `

    return c.json({ event: created[0] }, 201)
=======
import { randomInt } from 'node:crypto'
import { AppContext } from '../types/hono'
import { groupModel } from '../models/groupModel'
import { createGroupSchema, joinGroupSchema } from '../validators/groupValidators'

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// 暗号論的乱数による招待コード生成（Math.random は予測可能なため使用しない）
const generateInviteCode = (length = 8): string =>
  Array.from({ length }, () => INVITE_CHARS[randomInt(INVITE_CHARS.length)]).join('')

export const groupController = {
  // GET /api/groups - 所属グループ一覧取得（対象は常にログインユーザー本人）
  async getMyGroups(c: AppContext) {
    try {
      const userId = Number(c.get('jwtPayload').id)
      const groups = await groupModel.getUserGroups(userId)
      return c.json(groups)
    } catch (error) {
      console.error(error)
      return c.json({ error: 'グループ一覧の取得に失敗しました' }, 500)
    }
  },

  // POST /api/groups - 新規グループ作成（作成者をオーナーとして追加）
  async createGroup(c: AppContext) {
    try {
      const userId = Number(c.get('jwtPayload').id)
      const body = await c.req.json().catch(() => ({}))
      const parsed = createGroupSchema.safeParse(body)
      if (!parsed.success) {
        return c.json({ errors: parsed.error.issues.map((i) => i.message) }, 400)
      }
      const { groupName, color } = parsed.data

      const group = await groupModel.createGroup(groupName, generateInviteCode(), color)
      await groupModel.addMember(group.id, userId, 'owner')

      return c.json({ message: 'グループを作成しました', group }, 201)
    } catch (error) {
      console.error(error)
      return c.json({ error: 'グループ作成に失敗しました' }, 500)
    }
  },

  // POST /api/groups/join - 招待コードでのグループ参加
  async joinGroup(c: AppContext) {
    try {
      const userId = Number(c.get('jwtPayload').id)
      const body = await c.req.json().catch(() => ({}))
      const parsed = joinGroupSchema.safeParse(body)
      if (!parsed.success) {
        return c.json({ errors: parsed.error.issues.map((i) => i.message) }, 400)
      }

      const group = await groupModel.findByInviteCode(parsed.data.inviteCode)
      if (!group) {
        return c.json({ error: '無効な招待コードです' }, 404)
      }

      await groupModel.addMember(group.id, userId, 'member')

      return c.json({ message: 'グループに参加しました', group })
    } catch (error) {
      console.error(error)
      return c.json({ error: 'グループ参加に失敗しました' }, 500)
    }
  },

  // GET /api/groups/:id/events - 共有イベント一覧の取得（メンバーのみ）
  async getGroupEvents(c: AppContext) {
    try {
      const userId = Number(c.get('jwtPayload').id)
      const groupId = Number(c.req.param('id'))
      if (!Number.isInteger(groupId) || groupId <= 0) {
        return c.json({ error: 'グループIDが不正です' }, 400)
      }

      if (!(await groupModel.isMember(groupId, userId))) {
        return c.json({ error: 'このグループに対する権限がありません' }, 403)
      }

      const events = await groupModel.getGroupEvents(groupId)
      return c.json(events)
    } catch (error) {
      console.error(error)
      return c.json({ error: 'グループ予定の取得に失敗しました' }, 500)
    }
>>>>>>> 9ebca3ad1e61de31e8b84d5d95b4dbc84e539d83
  }
}

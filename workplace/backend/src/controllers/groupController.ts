import { Context } from 'hono'
import { sql } from '../config/db'
import { Env } from '../types/hono'
import { randomBytes } from 'node:crypto'
import type { CreateEventInput } from '../validators/eventValidators'
import { createGroupSchema } from '../validators/groupValidators'

function getUserId(c: Context<Env>) {
  return c.get('jwtPayload').id
}

function makeInviteCode() {
  // 128-bit (16 bytes) = 32 hex characters, much stronger than 32-bit (4 bytes = 8 hex chars)
  return randomBytes(16).toString('hex').toUpperCase()
}

export const GroupController = {
  // グループ一覧（color を追加取得）
  async list(c: Context<Env>) {
    const userId = getUserId(c)
    const isDemo = c.get('jwtPayload').mode === 'demo'

    if (isDemo) {
      const groups = await sql`
        SELECT g.id, g.group_name, g.color, gm.role
        FROM groups g
        JOIN group_members gm ON gm.group_id = g.id
        WHERE gm.user_id = ${userId} AND g.is_demo = true
        ORDER BY g.id DESC
      `
      return c.json({ groups })
    }

    const groups = await sql`
      SELECT g.id, g.group_name, g.color, g.invite_code, gm.role
      FROM groups g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE gm.user_id = ${userId}
      ORDER BY g.id DESC
    `

    return c.json({ groups })
  },

  // グループ作成（color に対応）
  async create(c: Context<Env>) {
    try {
      const userId = getUserId(c)
      const body = await c.req.json().catch(() => null)

      // body が null だった場合や型エラーを防ぐための安全な型チェック
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return c.json(
          { error: 'リクエストボディに name フィールドが必要です' },
          400
        )
      }

      const result = createGroupSchema.safeParse(body)
      if (!result.success) {
        return c.json(
          { error: result.error.issues[0].message },
          400
        )
      }

      const name = result.data.name.trim()

      if (!name) {
        return c.json({ error: 'グループ名は必須です' }, 400)
      }

      const inviteCode = makeInviteCode()

      // 有効期限は作成日から7日間（必要に応じて調整）
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      const created = await sql`
        INSERT INTO groups (name, invite_code, invite_code_expires_at, created_by)
        VALUES (${name}, ${inviteCode}, ${expiresAt}, ${userId})
        RETURNING id, name, invite_code, invite_code_expires_at
      `

      const group = created[0]

      await sql`
        INSERT INTO group_members (group_id, user_id, role)
        VALUES (${group.id}, ${userId}, 'admin')
        ON CONFLICT (group_id, user_id) DO NOTHING
      `

      return c.json({ group }, 201)
    } catch (err) {
      console.error('[GroupController.create Error]:', err)
      // 本番環境では詳細を返さない
      const isProduction =
        process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
      if (isProduction) {
        return c.json({ error: 'Internal Server Error' }, 500)
      }
      return c.json(
        { error: 'グループの作成に失敗しました', message: err instanceof Error ? err.message : String(err) },
        500
      )
    }
  },

  // グループ詳細とメンバー一覧
  async detail(c: Context<Env>) {
    const userId = getUserId(c)
    const groupId = Number(c.req.param('id'))

    if (!Number.isInteger(groupId) || groupId <= 0) {
      return c.json({ error: 'グループIDが不正です' }, 400)
    }

    const isDemo = c.get('jwtPayload').mode === 'demo'
    const accessCondition = isDemo
      ? sql`AND EXISTS (SELECT 1 FROM groups WHERE id = ${groupId} AND is_demo = true)`
      : sql``
    const access = await sql`
      SELECT role FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${userId}
        ${accessCondition}
    `

    if (access.length === 0) {
      return c.json({ error: 'このグループに参加していません' }, 403)
    }

    const result = await sql`
      SELECT id, name, invite_code, created_by, is_demo, color, invite_code
      FROM groups
      WHERE id = ${groupId}
    `

    if (result.length === 0) {
      return c.json({ error: 'グループが見つかりません' }, 404)
    }

    const members = await sql`
      SELECT u.id, u.name, u.email, u.picture, gm.role
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ${groupId}
      ORDER BY gm.role, u.name
    `

    const group: Record<string, unknown> = { ...result[0], role: access[0]?.role }
    if (isDemo) {
      delete group.invite_code
    }

    return c.json({ group, members })
  },

  // グループ情報の編集（管理者/admin・owner 専用）
  async update(c: Context<Env>) {
    const userId = getUserId(c)
    const groupId = Number(c.req.param('id'))

    if (!Number.isInteger(groupId) || groupId <= 0) {
      return c.json({ error: 'グループIDが不正です' }, 400)
    }

    // 1. ユーザーの権限を検証
    const access = await sql`
      SELECT role FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `

    if (access.length === 0) {
      return c.json({ error: 'このグループに参加していません' }, 403)
    }

    const role = access[0].role
    if (role !== 'admin' && role !== 'owner') {
      return c.json({ error: 'グループ情報の編集権限がありません（管理者のみ変更可能）' }, 403)
    }

    // 2. 更新データの抽出
    const body = await c.req.json().catch(() => ({}))
    const groupName = typeof body.groupName === 'string' ? body.groupName.trim() : (typeof body.name === 'string' ? body.name.trim() : null)
    const color = typeof body.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(body.color.trim()) ? body.color.trim() : null

    if (groupName !== null && (groupName.length === 0 || groupName.length > 50)) {
      return c.json({ error: 'グループ名は1〜50文字で入力してください' }, 400)
    }

    // 3. 更新処理の実行
    const updated = await sql`
      UPDATE groups
      SET 
        group_name = COALESCE(${groupName}, group_name),
        color = COALESCE(${color}, color)
      WHERE id = ${groupId}
      RETURNING id, group_name, color, invite_code
    `

    if (updated.length === 0) {
      return c.json({ error: '対象のグループが見つかりません' }, 404)
    }

    return c.json({ message: 'グループ情報を更新しました', group: updated[0] })
  },

  // 招待コードで参加
  async join(c: Context<Env>) {
    const userId = getUserId(c)
    const inviteCode = (c.req.param('inviteCode') || '').trim().toUpperCase()

    // デモユーザーは参加不可（防御策）
    if (c.get('jwtPayload').mode === 'demo') {
      return c.json({ error: 'デモモードではグループに参加できません。' }, 403)
    }

    if (!inviteCode || inviteCode.length > 32) {
      return c.json({ error: '招待コードが不正です。' }, 400)
    }

    // グループ検索（有効期限・使用済みチェック含む）
    const [group] = await sql`
      SELECT g.id, g.name, g.invite_code, g.invite_code_expires_at, g.invite_code_used
      FROM groups g
      WHERE UPPER(g.invite_code) = ${inviteCode}
    `

    if (!group) {
      return c.json({ error: '招待コードが見つからないか、既に使用されています。' }, 404)
    }

    // 有効期限チェック
    if (group.invite_code_expires_at && new Date() > group.invite_code_expires_at) {
      return c.json({ error: '招待コードの有効期限が切れています。' }, 400)
    }

    // 既に使用されているかチェック
    if (group.invite_code_used) {
      return c.json({ error: 'この招待コードは既に使用されています。' }, 400)
    }

    // ユーザーが既に参加しているかチェック
    const [existingMember] = await sql`
      SELECT id FROM group_members
      WHERE group_id = ${group.id} AND user_id = ${userId}
    `

    if (existingMember) {
      return c.json({ error: 'すでにこのグループに参加しています。' }, 400)
    }

    // メンバー追加
    await sql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${group.id}, ${userId}, 'member')
      ON CONFLICT (group_id, user_id) DO NOTHING
    `

    // 招待コードを使用済みにマーク
    await sql`
      UPDATE groups
      SET invite_code_used = TRUE
      WHERE id = ${group.id}
    `

    return c.json({ group: { id: group.id, name: group.name } })
  },

  // 管理者による招待コード再発行
  async rotateInviteCode(c: Context<Env>) {
    const userId = getUserId(c)
    const groupId = Number(c.req.param('groupId'))

    // グループアクセス権限チェック（管理者かオーナー）
    const [group] = await sql`
      SELECT g.created_by, gm.role
      FROM groups g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE g.id = ${groupId} AND gm.user_id = ${userId}
    `

    if (!group) {
      return c.json({ error: 'グループが見つかりません' }, 404)
    }

    if (group.role !== 'admin' && group.created_by !== userId) {
      return c.json({ error: 'この操作を行う権限がありません' }, 403)
    }

    // 新しい招待コードを生成
    const newInviteCode = makeInviteCode()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7日間有効

    // 古いコードを無効化し、新しいコードを設定
    await sql`
      UPDATE groups
      SET invite_code = ${newInviteCode},
          invite_code_expires_at = ${expiresAt},
          invite_code_used = FALSE
      WHERE id = ${groupId}
    `

    const [updated] = await sql`
      SELECT id, name, invite_code, invite_code_expires_at
      FROM groups
      WHERE id = ${groupId}
    `

    return c.json({ group: updated })
  },

  // グループから脱退
  async leave(c: Context<Env>) {
    const userId = getUserId(c)
    const groupId = Number(c.req.param('id'))

    if (!Number.isInteger(groupId) || groupId <= 0) {
      return c.json({ error: 'グループIDが不正です' }, 400)
    }

    // 自分の脱退処理
    const [group] = await sql`
      SELECT created_by FROM groups WHERE id = ${groupId}
    `

    if (!group) {
      return c.json({ error: 'グループが見つかりません' }, 404)
    }

    // グループの最終管理者が自分である場合はグループごと削除
    if (group.created_by === userId) {
      await sql`
        DELETE FROM group_members
        WHERE group_id = ${groupId} AND user_id = ${userId}
      `

      await sql`
        DELETE FROM events
        WHERE group_id = ${groupId}
          AND NOT EXISTS (
            SELECT 1 FROM group_members WHERE group_id = ${groupId}
          )
      `

      await sql`
        DELETE FROM groups
        WHERE id = ${groupId}
          AND NOT EXISTS (
            SELECT 1 FROM group_members WHERE group_id = ${groupId}
          )
      `
    } else {
      // それ以外のメンバーは単に脱退
      await sql`
        DELETE FROM group_members
        WHERE group_id = ${groupId} AND user_id = ${userId}
      `
    }

    const remainingGroup = await sql`
      SELECT id FROM groups WHERE id = ${groupId}
    `
    const groupDeleted = remainingGroup.length === 0

    return c.json({
      message: groupDeleted
        ? '最後のメンバーとしてグループから脱退し、グループを削除しました'
        : 'グループから脱退しました',
      groupDeleted,
    })
  },

  // 管理者によるメンバー削除
  async removeMember(c: Context<Env>, memberId: number) {
    const userId = getUserId(c)
    const groupId = Number(c.req.param('groupId'))

    if (!Number.isInteger(groupId) || groupId <= 0) {
      return c.json({ error: 'グループIDが不正です' }, 400)
    }

    if (!Number.isInteger(memberId) || memberId <= 0) {
      return c.json({ error: 'メンバーIDが不正です' }, 400)
    }

    // 自分自身の削除はできない
    if (memberId === userId) {
      return c.json({ error: '自分自身の削除はできません' }, 400)
    }

    // グループアクセス権限チェック（管理者かオーナー）
    const [group] = await sql`
      SELECT g.created_by, gm.role
      FROM groups g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE g.id = ${groupId} AND gm.user_id = ${userId}
    `

    if (!group) {
      return c.json({ error: 'グループが見つかりません' }, 404)
    }

    if (group.role !== 'admin' && group.created_by !== userId) {
      return c.json({ error: 'この操作を行う権限がありません' }, 403)
    }

    // メンバーがグループに参加しているかチェック
    const [member] = await sql`
      SELECT id FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${memberId}
    `

    if (!member) {
      return c.json({ error: '指定されたユーザーはこのグループに参加していません' }, 404)
    }

    // 最後の管理者が自分である場合は削除不可
    const [count] = await sql`
      SELECT COUNT(*) as cnt FROM group_members WHERE group_id = ${groupId} AND role = 'admin'
    `

    if (count.cnt === 1 && group.created_by === memberId) {
      return c.json({ error: '最後の管理者は削除できません' }, 400)
    }

    await sql`
      DELETE FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${memberId}
    `

    return c.json({ success: true })
  },

  // グループの共有イベント一覧 (GET /api/groups/:id/events?page=1&limit=20)
  async listEvents(c: Context<Env>) {
    const userId = getUserId(c)
    const groupId = Number(c.req.param('id'))
    const page = Number(c.req.query('page') || '1')
    const limit = Number(c.req.query('limit') || '20')

    if (!Number.isInteger(groupId) || groupId <= 0) {
      return c.json({ error: 'グループIDが不正です' }, 400)
    }

    if (page < 1 || limit < 1) {
      return c.json({ error: 'page と limit は1以上の値で指定してください' }, 400)
    }

    const offset = (page - 1) * limit

    const access = await sql`
      SELECT 1 FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `

    if (access.length === 0) {
      return c.json({ error: 'このグループに参加していません' }, 403)
    }

    const count = await sql`
      SELECT COUNT(*) as cnt FROM events WHERE group_id = ${groupId}
    `.then((r) => r[0].cnt)

    const events = await sql`
      SELECT 
        e.*, 
        g.color AS group_color,
        COALESCE(e.subject_color, g.color) AS display_color,
        creator.name AS creator_name, 
        editor.name AS editor_name
      FROM events e
      JOIN groups g ON e.group_id = g.id
      LEFT JOIN users creator ON e.created_by = creator.id
      LEFT JOIN users editor ON e.updated_by = editor.id
      WHERE e.group_id = ${groupId}
      ORDER BY e.start_time ASC
      LIMIT ${limit} OFFSET ${offset}
    `

    return c.json({ events, pagination: { page, limit, total: count } })
  },

  // グループの共有イベント作成
  async createEvent(c: Context<Env>) {
    const userId = getUserId(c)
    const groupId = Number(c.req.param('id'))

    if (!Number.isInteger(groupId) || groupId <= 0) {
      return c.json({ error: 'グループIDが不正です' }, 400)
    }

    // グループ所属権限の確認
    const access = await sql`
      SELECT 1 FROM group_members
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `

    if (access.length === 0) {
      return c.json({ error: 'このグループに参加していません' }, 403)
    }

    // タイトルを取得（大文字小文字の区別はせず、必要に応じてトリミング）
    const title = data.title || ''
    const description = data.description || null
    const startTime = data.start_time
    const endTime = data.end_time
    const subject = data.subject || null
    const subjectColor = data.subject_color || null

    const created = await sql`
      INSERT INTO events (
        group_id, created_by, updated_by, title, description,
        start_time, end_time, subject, subject_color
      )
      VALUES (
        ${groupId},
        ${userId},
        ${userId},
        ${title},
        ${description},
        ${startTime},
        ${endTime},
        ${subject},
        ${subjectColor}
      )
      RETURNING *
    `

    return c.json({ event: created[0] }, 201)
  },
}

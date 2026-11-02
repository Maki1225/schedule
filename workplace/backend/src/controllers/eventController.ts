import { AppContext } from '../types/hono'
import { sql } from '../config/db'
import { CreateEventInput, UpdateEventInput } from '../validators/eventValidators'

export const EventController = {
  // 1. 予定の作成 (POST /api/events)
  async create(c: AppContext, data: CreateEventInput) {
    try {
      const user = c.get('jwtPayload')
      const { group_id, title, description, start_time, end_time, subject, subject_color } = data

      // 日付の論理バリデーション
      if (new Date(start_time) >= new Date(end_time)) {
        return c.json({ error: '終了時刻は開始時刻より後の時間を指定してください' }, 400)
      }

      // グループ所属権限の確認
      const [membership] = await sql`
        SELECT role FROM group_members WHERE user_id = ${user.id} AND group_id = ${group_id}
      `
      if (!membership) {
        return c.json({ error: 'このグループに予定を作成する権限がありません' }, 403)
      }

      const eventQueries = [
        sql`
          INSERT INTO events (
            group_id, created_by, updated_by, title, description, start_time, end_time, subject, subject_color
          )
          VALUES (
            ${group_id}, ${user.id}, ${user.id}, ${title}, ${description ?? null}, ${start_time}, ${end_time}, ${subject ?? null}, ${subject_color ?? null}
          )
          RETURNING *
        `,
      ]

      if (description?.startsWith('[課題]')) {
        const deadline = new Intl.DateTimeFormat('ja-JP', {
          timeZone: 'Asia/Tokyo',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        }).format(new Date(end_time))
        eventQueries.push(sql`
          INSERT INTO group_chat_messages (group_id, sender_id, body, message_type)
          VALUES (
            ${group_id},
            ${user.id},
            ${`課題「${title}」を追加しました（提出期限：${deadline}）。`},
            'task'
          )
        `)
      }

      const [createdEvents] = await sql.transaction(eventQueries)
      const newEvent = createdEvents[0]

      return c.json({ message: '予定を作成しました', event: newEvent }, 201)
    } catch (err) {
      console.error('[EventController.create Error]:', err)
      return c.json({ error: '予定の作成に失敗しました' }, 500)
    }
  },

  // 2. 自分が所属する特定グループの予定一覧取得 (GET /api/events?groupId=xx&page=1&limit=20)
  async getByGroup(c: AppContext) {
    try {
      const user = c.get('jwtPayload')
      const groupId = c.req.query('groupId')
      const page = Number(c.req.query('page') || '1')
      const limit = Number(c.req.query('limit') || '20')

      if (!groupId) {
        return c.json({ error: 'groupId が指定されていません' }, 400)
      }

      if (page < 1 || limit < 1) {
        return c.json({ error: 'page と limit は1以上の値で指定してください' }, 400)
      }

      const offset = (page - 1) * limit

      const [membership] = await sql`
        SELECT role FROM group_members WHERE user_id = ${user.id} AND group_id = ${groupId}
      `
      if (!membership) {
        return c.json({ error: 'このグループの予定を閲覧する権限がありません' }, 403)
      }

      const count = await sql`
        SELECT COUNT(*) as cnt FROM events WHERE group_id = ${groupId}
      `.then((r) => r[0].cnt)

      const events = await sql`
        SELECT
          e.*,
          creator.name as creator_name,
          editor.name as editor_name
        FROM events e
        LEFT JOIN users creator ON e.created_by = creator.id
        LEFT JOIN users editor ON e.updated_by = editor.id
        WHERE e.group_id = ${groupId}
        ORDER BY e.start_time ASC
        LIMIT ${limit} OFFSET ${offset}
      `

      return c.json({ events, pagination: { page, limit, total: count } }, 200)
    } catch (err) {
      console.error('[EventController.getByGroup Error]:', err)
      return c.json({ error: '予定の取得に失敗しました' }, 500)
    }
  },

  // 3. 予定の更新 (PUT /api/events/:id)
  async update(c: AppContext, data: UpdateEventInput) {
    try {
      const user = c.get('jwtPayload')
      const eventId = c.req.param('id')

      const [existingEvent] = await sql`
        SELECT e.*, gm.role
        FROM events e
        INNER JOIN group_members gm ON e.group_id = gm.group_id AND gm.user_id = ${user.id}
        WHERE e.id = ${eventId}
      `

      if (!existingEvent) {
        return c.json({ error: '該当する予定が見つかりません' }, 404)
      }

      // 作成者本人または管理者(admin)のみ更新可
      if (String(existingEvent.created_by) !== String(user.id) && existingEvent.role !== 'admin') {
        return c.json({ error: 'この予定を更新する権限がありません' }, 403)
      }

      // 明示的に渡されたプロパティを割り当てる（Nullクリア対応）
      const title = 'title' in data ? data.title : existingEvent.title
      const description = 'description' in data ? data.description : existingEvent.description
      const start_time = 'start_time' in data ? data.start_time : existingEvent.start_time
      const end_time = 'end_time' in data ? data.end_time : existingEvent.end_time
      const subject = 'subject' in data ? data.subject : existingEvent.subject
      const subject_color = 'subject_color' in data ? data.subject_color : existingEvent.subject_color

      // 更新時の日付比較
      if (new Date(start_time!) >= new Date(end_time!)) {
        return c.json({ error: '終了時刻は開始時刻より後の時間を指定してください' }, 400)
      }

      const [updatedEvent] = await sql`
        UPDATE events
        SET title = ${title},
            description = ${description},
            start_time = ${start_time},
            end_time = ${end_time},
            subject = ${subject},
            subject_color = ${subject_color},
            updated_by = ${user.id},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${eventId}
        RETURNING *
      `

      return c.json({ message: '予定を更新しました', event: updatedEvent }, 200)
    } catch (err) {
      console.error('[EventController.update Error]:', err)
      return c.json({ error: '予定の更新に失敗しました' }, 500)
    }
  },

  // 4. 予定の削除 (DELETE /api/events/:id)
  async delete(c: AppContext) {
    try {
      const user = c.get('jwtPayload')
      const eventId = c.req.param('id')

      const [target] = await sql`
        SELECT e.id, e.created_by, gm.role
        FROM events e
        INNER JOIN group_members gm ON e.group_id = gm.group_id AND gm.user_id = ${user.id}
        WHERE e.id = ${eventId}
      `

      if (!target) {
        return c.json({ error: '予定が見つかりません' }, 404)
      }

      if (String(target.created_by) !== String(user.id) && target.role !== 'admin') {
        return c.json({ error: 'この予定を削除する権限がありません' }, 403)
      }

      await sql`DELETE FROM events WHERE id = ${eventId}`

      return c.json({ message: '予定を削除しました' }, 200)
    } catch (err) {
      console.error('[EventController.delete Error]:', err)
      return c.json({ error: '予定の削除に失敗しました' }, 500)
    }
  }
}
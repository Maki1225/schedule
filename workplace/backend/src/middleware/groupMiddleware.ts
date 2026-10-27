import { MiddlewareHandler } from 'hono'
import { Env } from '../types/hono'
import { sql } from '../config/db'

export const checkGroupAccess = (requireAdmin = false): MiddlewareHandler<Env> => {
  return async (c, next) => {
    const user = c.get('jwtPayload')

    // クエリパラメータ、パスパラメータから groupId を検索
    let groupId = c.req.query('groupId') || c.req.param('groupId')

    // POST等のJSONボディから groupId を取得（zValidatorを通過していれば c.req.valid('json') から安全に取得可能）
    if (!groupId && c.req.header('content-type')?.includes('application/json')) {
      try {
        const body = c.req.valid('json' as never) as { group_id?: number } | undefined
        if (body?.group_id) {
          groupId = String(body.group_id)
        }
      } catch {
        // zValidatorを通っていない、またはJSON解析に失敗した場合は無視して後続処理へ
      }
    }

    if (!groupId) {
      return c.json({ error: 'groupId が指定されていません' }, 400)
    }

    const [membership] = await sql`
      SELECT role FROM group_members
      WHERE user_id = ${user.id} AND group_id = ${Number(groupId)}
    `

    if (!membership) {
      return c.json({ error: 'このグループに対する権限がありません' }, 403)
    }

    if (requireAdmin && membership.role !== 'admin') {
      return c.json({ error: '管理者権限が必要です' }, 403)
    }

    // 後続処理で参照できるよう Context に保存
    c.set('groupRole', membership.role)
    await next()
  }
}
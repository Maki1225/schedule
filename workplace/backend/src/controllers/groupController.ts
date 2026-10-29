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
  }
}
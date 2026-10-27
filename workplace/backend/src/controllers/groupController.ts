import { Context } from 'hono'
import { groupModel } from '../models/groupModel'

export const groupController = {
  // GET /api/groups - 所属グループ一覧取得
  async getMyGroups(c: Context) {
    try {
      const userId = Number(c.req.query('userId'))
      if (!userId) {
        return c.json({ error: 'userIdが必要です' }, 400)
      }

      const groups = await groupModel.getUserGroups(userId)
      return c.json(groups)
    } catch (error) {
      console.error(error)
      return c.json({ error: 'グループ一覧の取得に失敗しました' }, 500)
    }
  },

  // POST /api/groups - 新規グループ作成（作成者をオーナーとして追加）
  async createGroup(c: Context) {
    try {
      const { groupName, userId, color } = await c.req.json()

      // 6桁の招待コード自動生成
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      const group = await groupModel.createGroup(groupName, inviteCode, color)
      await groupModel.addMember(group.id, userId, 'owner')

      return c.json({ message: 'グループを作成しました', group }, 201)
    } catch (error) {
      console.error(error)
      return c.json({ error: 'グループ作成に失敗しました' }, 500)
    }
  },

  // POST /api/groups/join - 招待コードでのグループ参加
  async joinGroup(c: Context) {
    try {
      const { inviteCode, userId } = await c.req.json()

      const group = await groupModel.findByInviteCode(inviteCode)
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

  // GET /api/groups/:id/events - 共有イベント一覧の取得
  async getGroupEvents(c: Context) {
    try {
      const groupId = Number(c.req.param('id'))
      const events = await groupModel.getGroupEvents(groupId)
      return c.json(events)
    } catch (error) {
      console.error(error)
      return c.json({ error: 'グループ予定の取得に失敗しました' }, 500)
    }
  }
}
import { AppContext } from '../types/hono'
import { UserModel } from '../models/authModel'
import { updateProfileSchema } from '../validators/userValidators'

export const userController = {
  // 1. ログインユーザーのプロフィール取得
  async getProfile(c: AppContext) {
    try {
      const userId = Number(c.get('jwtPayload').id)
      const user = await UserModel.findById(userId)

      if (!user) {
        return c.json({ error: 'ユーザーが見つかりません' }, 404)
      }

      return c.json({ user })
    } catch (err: any) {
      console.error('プロフィール取得エラー:', err)
      return c.json({ error: 'プロフィールの取得に失敗しました', message: err.message }, 500)
    }
  },

  // 2. プロフィール更新
  async updateProfile(c: AppContext) {
    try {
      const userId = Number(c.get('jwtPayload').id)
      const body = await c.req.json()

      // バリデーション実行
      const validationResult = updateProfileSchema.safeParse(body)
      if (!validationResult.success) {
        return c.json({ error: '入力内容が不正です', details: validationResult.error.format() }, 400)
      }

      const updatedUser = await UserModel.updateProfile(userId, validationResult.data)

      return c.json({
        message: 'プロフィールを更新しました',
        user: updatedUser,
      })
    } catch (err: any) {
      console.error('プロフィール更新エラー:', err)
      return c.json({ error: 'プロフィールの更新に失敗しました', message: err.message }, 500)
    }
  },
}
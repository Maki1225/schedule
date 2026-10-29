import { z } from 'zod'

// プロフィール更新時のスキーマ
export const updateProfileSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(50, '名前は50文字以内で入力してください').optional(),
  picture: z.string().url('有効なURLを入力してください').optional(),
})
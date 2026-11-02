import { z } from 'zod'

export const createGroupSchema = z.object({
  name: z
    .string({ message: 'グループ名は1〜50文字で入力してください' })
    .min(1, 'グループ名は1〜50文字で入力してください')
    .max(50, 'グループ名は1〜50文字で入力してください'),
})

export type CreateGroupInput = z.infer<typeof createGroupSchema>
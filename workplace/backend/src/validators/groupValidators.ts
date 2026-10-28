import { z } from 'zod'

export const createGroupSchema = z.object({
  groupName: z
    .string({ message: 'グループ名は必須です' })
    .trim()
    .min(1, 'グループ名を入力してください')
    .max(50, 'グループ名は50文字以内で入力してください'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'カラーは #RRGGBB 形式で指定してください')
    .optional(),
})

export const joinGroupSchema = z.object({
  inviteCode: z
    .string({ message: '招待コードは必須です' })
    .trim()
    .min(1, '招待コードを入力してください')
    .max(32, '招待コードが長すぎます')
    .transform((v) => v.toUpperCase()),
})

export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type JoinGroupInput = z.infer<typeof joinGroupSchema>

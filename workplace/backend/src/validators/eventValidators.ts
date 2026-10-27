import { z } from 'zod'

const isValidDateString = (val: string): boolean => !isNaN(new Date(val).getTime())

const baseEventSchema = z.object({
  group_id: z.number({ message: 'グループIDは必須です' }),
  title: z.string().min(1, 'タイトルを入力してください').max(100, 'タイトルは100文字以内で入力してください'),
  description: z.string().nullable().optional(),
  start_time: z.string().refine(isValidDateString, {
    message: '正しい日時フォーマット(ISO8601)で指定してください',
  }),
  end_time: z.string().refine(isValidDateString, {
    message: '正しい日時フォーマット(ISO8601)で指定してください',
  }),
  subject: z.string().nullable().optional(),
  subject_color: z.string().nullable().optional(),
})

// 新規作成用
export const createEventSchema = baseEventSchema.refine(
  (data) => new Date(data.start_time) < new Date(data.end_time),
  {
    message: '終了時刻は開始時刻より後に設定してください',
    path: ['end_time'],
  }
)

// 更新用 (group_id は変更不可とし、全フィールドを optional に)
export const updateEventSchema = baseEventSchema
  .omit({ group_id: true })
  .partial()
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return new Date(data.start_time) < new Date(data.end_time)
      }
      return true
    },
    {
      message: '終了時刻は開始時刻より後に設定してください',
      path: ['end_time'],
    }
  )

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
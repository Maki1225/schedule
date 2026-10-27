import { z } from 'zod'

export const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google 認証情報 (credential) は必須です'),
})

export type GoogleAuthInput = z.infer<typeof googleAuthSchema>
import { sql } from '../config/db'

export const EventModel = {
  // 全予定の取得
  async findAll() {
    return await sql`SELECT * FROM events ORDER BY start_date ASC`
  },

  // 新規予定の作成
  async create(title: string, startTime: string, endTime: string, userId: number) {
    const result = await sql`
      INSERT INTO events (title, start_time, end_time, created_by)
      VALUES (${title}, ${startTime}, ${endTime}, ${userId})
      RETURNING *
    `
    return result[0]
  },

  // 予定の削除
  async delete(id: string) {
    return await sql`DELETE FROM events WHERE id = ${id}`
  }
}
import { sql } from '../config/db'

export interface Group {
id?: number
group_name: string
color?: string
invite_code?: string
}

export const groupModel = {
  // 1. グループ新規作成
async createGroup(groupName: string, inviteCode: string, color: string = '#3b82f6') {
    const [group] = await sql`
    INSERT INTO groups (group_name, invite_code, color)
    VALUES (${groupName}, ${inviteCode}, ${color})
      RETURNING *
    `
    return group
},

  // 2. 招待コードからグループ検索
async findByInviteCode(inviteCode: string) {
    const [group] = await sql`
      SELECT * FROM groups WHERE invite_code = ${inviteCode}
    `
    return group
},

  // 3. グループメンバーの追加 (PRIMARY KEY(user_id, group_id) による重複防止)
async addMember(groupId: number, userId: number, role: string = 'member') {
    const [member] = await sql`
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (${groupId}, ${userId}, ${role})
    ON CONFLICT (user_id, group_id) DO NOTHING
      RETURNING *
    `
    return member
},

  // 4. ユーザーが所属するグループ一覧の取得
async getUserGroups(userId: number) {
    return await sql`
    SELECT g.*, gm.role
    FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = ${userId}
    ORDER BY g.id DESC
    `
},

  // 5. グループ内の共有イベント一覧取得 (created_by で users と結合)
async getGroupEvents(groupId: number) {
    return await sql`
    SELECT
        e.*,
        u.name AS user_name,
        u.picture AS user_picture
    FROM events e
    LEFT JOIN users u ON e.created_by = u.id
    WHERE e.group_id = ${groupId}
    ORDER BY e.start_time ASC
    `
}
}
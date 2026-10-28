import { sql } from '../config/db'

export interface User {
  id: number
  google_id: string
  name: string
  email: string
  picture?: string
  google_access_token?: string
  google_refresh_token?: string
  google_token_expires_at?: number
}

export const UserModel = {
  async findById(userId: number) {
    const [user] = await sql`
      SELECT id, name, email, picture, created_at
      FROM users
      WHERE id = ${userId}
    `
    return user
  },

  async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await sql`SELECT * FROM users WHERE google_id = ${googleId}`
    if (result.length === 0) return null
    return result[0] as User
  },

  async findByEmail(email: string): Promise<User | null> {
    const result = await sql`SELECT * FROM users WHERE email = ${email}`
    if (result.length === 0) return null
    return result[0] as User
  },

  async createGoogleUser(
    googleId: string,
    name: string,
    email: string,
    picture: string
  ): Promise<User> {
    const result = await sql`
      INSERT INTO users (google_id, name, email, picture)
      VALUES (${googleId}, ${name}, ${email}, ${picture})
      RETURNING *
    `
    return result[0] as User
  },

  async updateProfile(userId: number, data: { name?: string; picture?: string }) {
    const [updatedUser] = await sql`
      UPDATE users
      SET
        name = COALESCE(${data.name}, name),
        picture = COALESCE(${data.picture}, picture)
      WHERE id = ${userId}
      RETURNING id, name, email, picture, created_at
    `
    return updatedUser
  },

  async updateGoogleTokens(
    userId: number,
    tokens: {
      accessToken: string | null
      refreshToken: string | null
      expiryDate: number | null
    }
  ) {
    if (tokens.refreshToken) {
      await sql`
        UPDATE users
        SET google_access_token = ${tokens.accessToken},
            google_refresh_token = ${tokens.refreshToken},
            google_token_expires_at = ${tokens.expiryDate}
        WHERE id = ${userId}
      `
    } else {
      await sql`
        UPDATE users
        SET google_access_token = ${tokens.accessToken},
            google_token_expires_at = ${tokens.expiryDate}
        WHERE id = ${userId}
      `
    }
  },
}
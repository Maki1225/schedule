import { sql } from '../config/db'
import { getEncryptedTokens, getDecryptedTokens } from '../utils/encryptTokens'

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
  async getTokenVersion(id: string | number): Promise<number | null> {
    const result = await sql`
      SELECT token_version
      FROM users
      WHERE id = ${id}
    `
    if (result.length === 0) return null
    return result[0].token_version as number
  },

  async incrementTokenVersion(id: string | number): Promise<number | null> {
    const result = await sql`
      UPDATE users
      SET token_version = token_version + 1
      WHERE id = ${id}
      RETURNING token_version
    `
    if (result.length === 0) return null
    return result[0].token_version as number
  },

  async findById(id: string | number): Promise<User | null> {
    const result = await sql`
      SELECT id, google_id, name, email, picture
      FROM users
      WHERE id = ${id}
    `
    if (result.length === 0) return null
    return result[0] as User
  },

  async updateName(id: string | number, name: string): Promise<User | null> {
    const result = await sql`
      UPDATE users
      SET name = ${name}
      WHERE id = ${id}
      RETURNING id, google_id, name, email, picture
    `
    if (result.length === 0) return null
    return result[0] as User
  },

  async updatePicture(id: string | number, picture: string): Promise<User | null> {
    const result = await sql`
      UPDATE users
      SET picture = ${picture}
      WHERE id = ${id}
      RETURNING id, google_id, name, email, picture
    `
    if (result.length === 0) return null
    return result[0] as User
  },

  async findGoogleTokens(id: string | number): Promise<{
    google_access_token: string | null
    google_refresh_token: string | null
    google_token_expires_at: number | null
  } | null> {
    const result = await sql`
      SELECT google_access_token, google_refresh_token, google_token_expires_at
      FROM users
      WHERE id = ${id}
    `
    if (result.length === 0) return null
    const rawTokens = result[0] as {
      google_access_token: string | null
      google_refresh_token: string | null
      google_token_expires_at: number | null
    }
    const decrypted = getDecryptedTokens({
      accessToken: rawTokens.google_access_token,
      refreshToken: rawTokens.google_refresh_token,
      expiryDate: rawTokens.google_token_expires_at,
    })
    return {
      google_access_token: decrypted.accessToken,
      google_refresh_token: decrypted.refreshToken,
      google_token_expires_at: decrypted.expiryDate
    }
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

  async updateGoogleTokens(
    userId: number,
    tokens: {
      accessToken: string | null
      refreshToken: string | null
      expiryDate: number | null
    }
  ) {
    const encrypted = getEncryptedTokens(tokens)
    if (encrypted.refreshToken) {
      await sql`
        UPDATE users
        SET google_access_token = ${encrypted.accessToken},
            google_refresh_token = ${encrypted.refreshToken},
            google_token_expires_at = ${encrypted.expiryDate}
        WHERE id = ${userId}
      `
    } else {
      await sql`
        UPDATE users
        SET google_access_token = ${encrypted.accessToken},
            google_token_expires_at = ${encrypted.expiryDate}
        WHERE id = ${userId}
      `
    }
  },
}
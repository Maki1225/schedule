import { encrypt, decrypt } from './crypto'

export function encryptToken(plainText: string | null): string | null {
  if (!plainText) return null
  return encrypt(plainText)
}

export function decryptToken(encryptedToken: string | null): string | null {
  if (!encryptedToken) return null
  return decrypt(encryptedToken)
}

export function getEncryptedTokens(tokens: {
  accessToken: string | null
  refreshToken: string | null
  expiryDate: number | null
}): {
  accessToken: string | null
  refreshToken: string | null
  expiryDate: number | null
} {
  return {
    accessToken: encryptToken(tokens.accessToken),
    refreshToken: encryptToken(tokens.refreshToken),
    expiryDate: tokens.expiryDate
  }
}

export function getDecryptedTokens(tokens: {
  accessToken: string | null
  refreshToken: string | null
  expiryDate: number | null
}): {
  accessToken: string | null
  refreshToken: string | null
  expiryDate: number | null
} {
  return {
    accessToken: decryptToken(tokens.accessToken),
    refreshToken: decryptToken(tokens.refreshToken),
    expiryDate: tokens.expiryDate
  }
}

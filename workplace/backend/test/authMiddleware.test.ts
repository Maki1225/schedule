import assert from 'node:assert/strict'
import test from 'node:test'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { createAuthCheck } from '../src/middleware/authMiddleware'

const secret = 'test-secret-for-token-version'

async function createApp(currentTokenVersion: number) {
  process.env.JWT_SECRET = secret
  const app = new Hono()
  app.get(
    '/protected',
    createAuthCheck(async () => currentTokenVersion),
    (c) => c.json({ ok: true })
  )
  return app
}

async function makeToken(tokenVersion: number) {
  return sign(
    {
      id: 12,
      email: 'user@example.com',
      token_version: tokenVersion,
      exp: Math.floor(Date.now() / 1000) + 60,
    },
    secret
  )
}

test('rejects a JWT from before the user token version was incremented', async () => {
  const app = await createApp(2)
  const response = await app.request('/protected', {
    headers: { Authorization: `Bearer ${await makeToken(1)}` },
  })

  assert.equal(response.status, 401)
})

test('accepts a JWT matching the current user token version', async () => {
  const app = await createApp(2)
  const response = await app.request('/protected', {
    headers: { Authorization: `Bearer ${await makeToken(2)}` },
  })

  assert.equal(response.status, 200)
})

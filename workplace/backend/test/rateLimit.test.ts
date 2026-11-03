import assert from 'node:assert/strict'
import test from 'node:test'
import { Hono } from 'hono'
import { MemoryStore } from 'hono-rate-limiter'
import { createRequestRateLimiter } from '../src/middleware/rateLimit'

test('returns 429 after the configured request limit is exceeded', async () => {
  const app = new Hono()
  app.post(
    '/login',
    createRequestRateLimiter('test-login', 2, 60_000, new MemoryStore()),
    (c) => c.json({ ok: true })
  )

  const request = () => app.request('/login', {
    method: 'POST',
    headers: { 'x-real-ip': '192.0.2.10' },
  })

  assert.equal((await request()).status, 200)
  assert.equal((await request()).status, 200)
  assert.equal((await request()).status, 429)
})

test('can skip requests outside the limited methods', async () => {
  const app = new Hono()
  app.use(
    '*',
    createRequestRateLimiter(
      'test-write',
      1,
      60_000,
      new MemoryStore(),
      (c) => !['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)
    )
  )
  app.get('/write', (c) => c.json({ ok: true }))
  app.post('/write', (c) => c.json({ ok: true }))

  assert.equal((await app.request('/write')).status, 200)
  assert.equal((await app.request('/write')).status, 200)
  assert.equal((await app.request('/write', { method: 'POST' })).status, 200)
  assert.equal((await app.request('/write', { method: 'POST' })).status, 429)
})

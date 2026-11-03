import { Hono } from 'hono'
import { Env } from '../types/hono'
import { DemoController } from '../controllers/demoController'
import { requireJsonContentType } from '../middleware/requestSecurity'
import { demoSessionRateLimit, inviteCodeRateLimit } from '../middleware/rateLimit'

const demoRoutes = new Hono<Env>()

demoRoutes.post('/sessions', demoSessionRateLimit, requireJsonContentType, (c) => DemoController.createSession(c))
demoRoutes.get('/me', (c) => DemoController.getSession(c))
demoRoutes.get('/groups/invite/:inviteCode', inviteCodeRateLimit, (c) => DemoController.previewGroup(c))
demoRoutes.delete('/sessions/current', (c) => DemoController.endSession(c))

export default demoRoutes

import { Hono } from 'hono'
import { Env } from '../types/hono'
import { DemoController } from '../controllers/demoController'

const demoRoutes = new Hono<Env>()

demoRoutes.post('/sessions', (c) => DemoController.createSession(c))
demoRoutes.get('/me', (c) => DemoController.getSession(c))
demoRoutes.delete('/sessions/current', (c) => DemoController.endSession(c))

export default demoRoutes

<<<<<<< HEAD

import { Hono } from 'hono'
import { Env } from '../types/hono'
import { authCheck } from '../middleware/authMiddleware'
import { GroupController } from '../controllers/groupController'

const groupRoutes = new Hono<Env>()

groupRoutes.use('*', authCheck)

groupRoutes.get('/', (c) => GroupController.list(c))
groupRoutes.post('/', (c) => GroupController.create(c))
groupRoutes.post('/join', (c) => GroupController.join(c))
groupRoutes.get('/:id', (c) => GroupController.detail(c))
groupRoutes.get('/:id/events', (c) => GroupController.listEvents(c))
groupRoutes.post('/:id/events', (c) => GroupController.createEvent(c))
=======
import { Hono } from 'hono'
import { Env } from '../types/hono'
import { authCheck } from '../middleware/authMiddleware'
import { groupController } from '../controllers/groupController'

const groupRoutes = new Hono<Env>()

// すべてのグループ関連ルートに認証チェックを適用
groupRoutes.use('*', authCheck)

// GET /api/groups
groupRoutes.get('/', groupController.getMyGroups)

// POST /api/groups
groupRoutes.post('/', groupController.createGroup)

// POST /api/groups/join
groupRoutes.post('/join', groupController.joinGroup)

// GET /api/groups/:id/events
groupRoutes.get('/:id/events', groupController.getGroupEvents)
>>>>>>> 9ebca3ad1e61de31e8b84d5d95b4dbc84e539d83

export default groupRoutes

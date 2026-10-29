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

export default groupRoutes
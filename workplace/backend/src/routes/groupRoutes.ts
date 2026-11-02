
import { Hono } from 'hono'
import { Env } from '../types/hono'
import { authCheck, rejectDemoAccess } from '../middleware/authMiddleware'
import { GroupController } from '../controllers/groupController'
import { GroupChatController } from '../controllers/groupChatController'
import { requireJsonContentType } from '../middleware/requestSecurity'
import { groupInviteCodeRateLimit } from '../middleware/rateLimit'

const groupRoutes = new Hono<Env>()

groupRoutes.get('/', authCheck, (c) => GroupController.list(c))
groupRoutes.post('/', requireJsonContentType, authCheck, rejectDemoAccess, (c) => GroupController.create(c))
groupRoutes.post('/join', groupInviteCodeRateLimit, requireJsonContentType, authCheck, rejectDemoAccess, (c) => GroupController.join(c))
groupRoutes.get('/:id/messages', authCheck, (c) => GroupChatController.list(c))
groupRoutes.post('/:id/messages', requireJsonContentType, authCheck, rejectDemoAccess, (c) => GroupChatController.create(c))
groupRoutes.delete('/:id/leave', authCheck, rejectDemoAccess, (c) => GroupController.leave(c))
groupRoutes.get('/:id', authCheck, rejectDemoAccess, (c) => GroupController.detail(c))
groupRoutes.get('/:id/events', authCheck, rejectDemoAccess, (c) => GroupController.listEvents(c))
groupRoutes.post('/:id/events', requireJsonContentType, authCheck, rejectDemoAccess, (c) => GroupController.createEvent(c))

export default groupRoutes

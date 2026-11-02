import { Hono } from 'hono'
import { Env } from '../types/hono'
import { authCheck, rejectDemoAccess } from '../middleware/authMiddleware'
import { GroupController } from '../controllers/groupController'
import { createGroupSchema } from '../validators/groupValidators'
import { createEventSchema } from '../validators/eventValidators'
import { GroupChatController } from '../controllers/groupChatController'
import { requireJsonContentType } from '../middleware/requestSecurity'
import { groupInviteCodeRateLimit } from '../middleware/rateLimit'
import { apiWriteRateLimit } from '../middleware/rateLimit'

const groupRoutes = new Hono<Env>()

groupRoutes.get('/', authCheck, (c) => GroupController.list(c))
groupRoutes.post('/', requireJsonContentType, authCheck, rejectDemoAccess, (c) => GroupController.create(c))
groupRoutes.post('/join', groupInviteCodeRateLimit, requireJsonContentType, authCheck, rejectDemoAccess, (c) => GroupController.join(c))
groupRoutes.get('/:id/messages', authCheck, (c) => GroupChatController.list(c))
groupRoutes.post('/:id/messages', requireJsonContentType, authCheck, rejectDemoAccess, (c) => GroupChatController.create(c))
groupRoutes.delete('/:id/leave', authCheck, rejectDemoAccess, (c) => GroupController.leave(c))
groupRoutes.get('/:id', authCheck, rejectDemoAccess, (c) => GroupController.detail(c))
groupRoutes.get('/:id/events', authCheck, rejectDemoAccess, (c) => GroupController.listEvents(c))
groupRoutes.post('/:id/events', requireJsonContentType, authCheck, rejectDemoAccess, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const result = createEventSchema.safeParse(body)

  if (!result.success) {
    const errors = result.error.issues.map((issue) => issue.message)
    return c.json({ errors }, 400)
  }

  return GroupController.createEvent(c, result.data)
})
// 招待コード再発行（管理者のみ）
groupRoutes.post('/:id/invite-code/rotate', requireJsonContentType, authCheck, rejectDemoAccess, (c) => GroupController.rotateInviteCode(c))
// メンバー削除（管理者のみ）
groupRoutes.delete('/:id/members/:memberId', authCheck, rejectDemoAccess, (c) => GroupController.removeMember(c, Number(c.req.param('memberId'))))

export default groupRoutes
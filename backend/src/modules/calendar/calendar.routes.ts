import { Router } from 'express'
import * as ctrl from './calendar.controller'
import { authMiddleware } from '../../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

router.get('/events', ctrl.getEvents)
router.post('/events', ctrl.createEvent)
router.delete('/events/:id', ctrl.deleteEvent)
router.post('/sync', ctrl.syncFromGoogle)

export default router

import { Router } from 'express'
import * as ctrl from './tracking.controller'
import { authMiddleware } from '../../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

router.get('/sessions', ctrl.getSessions)
router.post('/sessions', ctrl.startSession)
router.patch('/sessions/:id/stop', ctrl.stopSession)
router.get('/categories', ctrl.getCategories)
router.post('/categories', ctrl.createCategory)

export default router

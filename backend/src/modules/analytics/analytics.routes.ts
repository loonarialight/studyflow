import { Router } from 'express'
import * as ctrl from './analytics.controller'
import { authMiddleware } from '../../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

router.get('/weekly', ctrl.weekly)
router.get('/daily', ctrl.daily)
router.get('/heatmap', ctrl.heatmap)

export default router

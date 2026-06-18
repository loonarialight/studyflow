import { Router } from 'express'
import * as ctrl from './groups.controller'
import { authMiddleware } from '../../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

router.get('/', ctrl.list)
router.post('/', ctrl.create)
router.get('/:id', ctrl.getOne)
router.post('/:id/join', ctrl.join)
router.post('/:id/leave', ctrl.leave)
router.get('/:id/rankings', ctrl.rankings)
router.get('/:id/messages', ctrl.messages)
router.post('/:id/messages', ctrl.sendMessage)

// ─── Day-off ────────────────────────────────────────────────────────────────
router.post('/:id/dayoff', ctrl.setDayOff)
router.get('/:id/dayoff', ctrl.getDayOffs)

// ─── Presence ("кто сейчас учится") ───────────────────────────────────────────
router.get('/:id/presence', ctrl.presence)

export default router
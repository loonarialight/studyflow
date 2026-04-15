import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import * as goals from './goals.controller'

const router = Router()
router.use(authMiddleware)

router.get('/', goals.getGoals)
router.post('/', goals.createGoal)
router.put('/:id', goals.updateGoal)
router.delete('/:id', goals.deleteGoal)
router.patch('/:id/primary', goals.setPrimary)

export default router
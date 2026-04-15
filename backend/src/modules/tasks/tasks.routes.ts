import { Router } from 'express'
import * as ctrl from './tasks.controller'
import { authMiddleware } from '../../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

router.get('/', ctrl.getTasks)
router.post('/', ctrl.createTask)
router.patch('/:id', ctrl.updateTask)
router.delete('/:id', ctrl.deleteTask)

export default router
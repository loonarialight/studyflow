import { Router } from 'express'
import * as ctrl from './auth.controller'

const router = Router()

router.post('/register', ctrl.register)
router.post('/login', ctrl.login)
router.post('/refresh', ctrl.refreshToken)
router.get('/google', ctrl.googleAuth)
router.get('/google/callback', ctrl.googleCallback)

export default router

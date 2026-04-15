import { Router } from 'express'
import * as learn from './learn.controller'
import { authMiddleware } from '../../middleware/auth.middleware'

const router = Router()

router.get('/tracks', learn.getTracks)
router.get('/tracks/:slug/subjects', authMiddleware, learn.getSubjectsByTrack)
router.get('/subjects/:id', authMiddleware, learn.getSubject)
router.get('/lessons/:id', authMiddleware, learn.getLesson)
router.post('/lessons/:id/submit', authMiddleware, learn.submitTest)
router.post('/lessons/:id/complete', authMiddleware, learn.completeLesson)

router.get('/planner', authMiddleware, learn.getPlanner)

export default router
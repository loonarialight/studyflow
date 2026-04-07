import { Router } from 'express'
import multer from 'multer'
import * as ctrl from './ai.controller'
import { authMiddleware } from '../../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

router.get('/chats', ctrl.getChats)
router.post('/chats', ctrl.createChat)
router.delete('/chats/:id', ctrl.deleteChat)
router.get('/chats/:id/messages', ctrl.getMessages)
router.post('/chats/:id/messages', ctrl.sendMessage)
router.post('/parse-schedule', upload.single('file'), ctrl.parseSchedule)
router.post('/import-events', ctrl.importEvents)

export default router
import { Router } from 'express'
import { adminMiddleware } from '@/middleware/admin.middleware'
import * as admin from './admin.controller'

const router = Router()

router.use(adminMiddleware)

// Dashboard
router.get('/dashboard', admin.getDashboard)

// Tracks
router.get('/tracks', admin.getTracks)
router.post('/tracks', admin.createTrack)
router.put('/tracks/:id', admin.updateTrack)
router.delete('/tracks/:id', admin.deleteTrack)

// Subjects
router.get('/subjects', admin.getSubjects)
router.post('/subjects', admin.createSubject)
router.put('/subjects/:id', admin.updateSubject)
router.delete('/subjects/:id', admin.deleteSubject)

// Chapters
router.get('/chapters', admin.getChapters)
router.post('/chapters', admin.createChapter)
router.put('/chapters/:id', admin.updateChapter)
router.delete('/chapters/:id', admin.deleteChapter)

// Lessons
router.get('/lessons', admin.getLessons)
router.get('/lessons/:id', admin.getLessonById)
router.post('/lessons', admin.createLesson)
router.put('/lessons/:id', admin.updateLesson)
router.delete('/lessons/:id', admin.deleteLesson)
router.patch('/lessons/:id/publish', admin.publishLesson)

// Questions
router.get('/questions', admin.getQuestions)
router.post('/questions', admin.createQuestion)
router.put('/questions/:id', admin.updateQuestion)
router.delete('/questions/:id', admin.deleteQuestion)
router.post('/questions/bulk', admin.bulkSaveQuestions)

// Users
router.get('/users', admin.getUsers)
router.patch('/users/:id/role', admin.updateUserRole)
router.delete('/users/:id', admin.deleteUser)

export default router
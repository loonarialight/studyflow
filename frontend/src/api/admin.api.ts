import axios from 'axios'

const api = axios.create({ baseURL: '/api/admin' })

const learnApiInstance = axios.create({ baseURL: '/api' })


api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})


learnApiInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const goalsApiInstance = axios.create({ baseURL: '/api' })
goalsApiInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const adminApi = {
  // Dashboard
  getDashboard: () => api.get('/dashboard').then((r) => r.data),

  // Tracks
  getTracks: () => api.get('/tracks').then((r) => r.data),
  createTrack: (data: object) => api.post('/tracks', data).then((r) => r.data),
  updateTrack: (id: string, data: object) => api.put(`/tracks/${id}`, data).then((r) => r.data),
  deleteTrack: (id: string) => api.delete(`/tracks/${id}`).then((r) => r.data),

  // Subjects
  getSubjects: (trackId?: string) => api.get('/subjects', { params: { trackId } }).then((r) => r.data),
  createSubject: (data: object) => api.post('/subjects', data).then((r) => r.data),
  updateSubject: (id: string, data: object) => api.put(`/subjects/${id}`, data).then((r) => r.data),
  deleteSubject: (id: string) => api.delete(`/subjects/${id}`).then((r) => r.data),

  // Chapters
  getChapters: (subjectId?: string) => api.get('/chapters', { params: { subjectId } }).then((r) => r.data),
  createChapter: (data: object) => api.post('/chapters', data).then((r) => r.data),
  updateChapter: (id: string, data: object) => api.put(`/chapters/${id}`, data).then((r) => r.data),
  deleteChapter: (id: string) => api.delete(`/chapters/${id}`).then((r) => r.data),

  // Lessons
  getLessons: (chapterId?: string) => api.get('/lessons', { params: { chapterId } }).then((r) => r.data),
  getLessonById: (id: string) => api.get(`/lessons/${id}`).then((r) => r.data),
  createLesson: (data: object) => api.post('/lessons', data).then((r) => r.data),
  updateLesson: (id: string, data: object) => api.put(`/lessons/${id}`, data).then((r) => r.data),
  deleteLesson: (id: string) => api.delete(`/lessons/${id}`).then((r) => r.data),
  publishLesson: (id: string, isPublished: boolean) =>
    api.patch(`/lessons/${id}/publish`, { isPublished }).then((r) => r.data),

  // Questions
  getQuestions: (lessonId: string) => api.get('/questions', { params: { lessonId } }).then((r) => r.data),
  createQuestion: (data: object) => api.post('/questions', data).then((r) => r.data),
  updateQuestion: (id: string, data: object) => api.put(`/questions/${id}`, data).then((r) => r.data),
  deleteQuestion: (id: string) => api.delete(`/questions/${id}`).then((r) => r.data),
  bulkSaveQuestions: (lessonId: string, questions: object[]) =>
    api.post('/questions/bulk', { lessonId, questions }).then((r) => r.data),

  // Users
  getUsers: (params: { page?: number; search?: string }) => api.get('/users', { params }).then((r) => r.data),
  updateUserRole: (id: string, role: string) => api.patch(`/users/${id}/role`, { role }).then((r) => r.data),
  deleteUser: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
}

export const learnApi = {
  getTracks: () => learnApiInstance.get('/learn/tracks'),
  getSubjects: (trackSlug: string) => learnApiInstance.get(`/learn/tracks/${trackSlug}/subjects`),
  getSubject: (subjectId: string) => learnApiInstance.get(`/learn/subjects/${subjectId}`),
  getLesson: (lessonId: string) => learnApiInstance.get(`/learn/lessons/${lessonId}`),
  submitTest: (lessonId: string, answers: Record<string, string[]>) =>
    learnApiInstance.post(`/learn/lessons/${lessonId}/submit`, { answers }),
  completeLesson: (lessonId: string) => learnApiInstance.post(`/learn/lessons/${lessonId}/complete`),
  getPlanner: (slug = 'highschool') => learnApiInstance.get(`/learn/planner?slug=${slug}`),
}

export const tasksApi = {
  getTasks: () => learnApiInstance.get('/tasks'),
  createTask: (data: object) => learnApiInstance.post('/tasks', data),
  updateTask: (id: string, data: object) => learnApiInstance.patch(`/tasks/${id}`, data),
  deleteTask: (id: string) => learnApiInstance.delete(`/tasks/${id}`),
}

export const goalsApi = {
  getGoals: () => goalsApiInstance.get('/goals'),
  createGoal: (data: object) => goalsApiInstance.post('/goals', data),
  updateGoal: (id: string, data: object) => goalsApiInstance.put(`/goals/${id}`, data),
  deleteGoal: (id: string) => goalsApiInstance.delete(`/goals/${id}`),
  setPrimary: (id: string) => goalsApiInstance.patch(`/goals/${id}/primary`),
}
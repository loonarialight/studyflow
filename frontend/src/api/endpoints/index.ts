import { id } from 'date-fns/locale/id';
import { api } from '../client'

// ─── Auth ─────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; name: string; tag: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  googleUrl: () => api.get('/auth/google'),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
}

// ─── Tracking ─────────────────────────────────────────────────
export const trackingApi = {
  getSessions: (params?: object) => api.get('/tracking/sessions', { params }),
  startSession: (data: object) => api.post('/tracking/sessions', data),
  stopSession: (id: string) => api.patch(`/tracking/sessions/${id}/stop`),
  getCategories: () => api.get('/tracking/categories'),
  createCategory: (data: object) => api.post('/tracking/categories', data),
}

// ─── Calendar ─────────────────────────────────────────────────
export const calendarApi = {
  getEvents: (params?: { from?: string; to?: string }) =>
    api.get('/calendar/events', { params }),
  createEvent: (data: object) => api.post('/calendar/events', data),
  deleteEvent: (id: string) => api.delete(`/calendar/events/${id}`),
  syncFromGoogle: () => api.post('/calendar/sync'),
}

// ─── Analytics ────────────────────────────────────────────────
export const analyticsApi = {
  weekly: () => api.get('/analytics/weekly'),
  daily: (from: string, to: string) => api.get('/analytics/daily', { params: { from, to } }),
  heatmap: (year?: number) => api.get('/analytics/heatmap', { params: { year } }),
}

// ─── Groups ───────────────────────────────────────────────────
export const groupsApi = {
  list: (params?: object) => api.get('/groups', { params }),
  create: (data: object) => api.post('/groups', data),
  get: (id: string) => api.get(`/groups/${id}`),
  join: (id: string) => api.post(`/groups/${id}/join`),
  leave: (id: string) => api.post(`/groups/${id}/leave`),
  rankings: (id: string) => api.get(`/groups/${id}/rankings`),
  messages: (id: string, page?: number) =>
    api.get(`/groups/${id}/messages`, { params: { page } }),
   sendMessage: (id: string, data: { content: string }) =>
    api.post(`/groups/${id}/messages`, data), 
}

// ─── AI Chat ─────────────────────────────────────────────────
export const aiApi = {
  getChats: () =>
    api.get('/ai/chats'),

  createChat: (title: string) =>
    api.post('/ai/chats', { title }),

  deleteChat: (chatId: string) =>
    api.delete(`/ai/chats/${chatId}`),

  getMessages: (chatId: string) =>
    api.get(`/ai/chats/${chatId}/messages`),

  sendMessage: (chatId: string, message: string) =>
    api.post(`/ai/chats/${chatId}/messages`, { message }),

  parseSchedule: (text: string) =>
    api.post('/ai/parse-schedule', { text }),

  importEvents: (events: any[]) =>
    api.post('/ai/import-events', { events }),
}
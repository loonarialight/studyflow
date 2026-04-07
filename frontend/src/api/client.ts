import axios from 'axios'

const BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request: attach JWT ──────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response: auto-refresh on 401 ───────────────────────────
let isRefreshing = false
let queue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          })
        })
      }

      isRefreshing = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        const newToken = data.data.accessToken

        localStorage.setItem('accessToken', newToken)
        queue.forEach((cb) => cb(newToken))
        queue = []

        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

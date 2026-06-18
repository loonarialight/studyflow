import { create } from 'zustand'
import { trackingApi } from '../api/endpoints'

type TimerMode = 'idle' | 'running' | 'paused' | 'pomodoro_work' | 'pomodoro_break'

interface TimerState {
  mode: TimerMode
  sessionId: string | null
  elapsed: number        // seconds
  subject: string
  categoryId: string | null
  groupId: string | null   // если сессия запущена из конкретной группы
  intervalRef: ReturnType<typeof setInterval> | null

  // Pomodoro
  pomodoroCount: number
  pomodoroWorkMin: number
  pomodoroBreakMin: number

  start: (subject?: string, categoryId?: string | null, isPomodoro?: boolean, groupId?: string | null) => Promise<void>
  stop: () => Promise<void>
  pause: () => void
  resume: () => void
  setSubject: (subject: string) => void
  tick: () => void
  reset: () => void
}

export const useTimerStore = create<TimerState>((set, get) => ({
  mode: 'idle',
  sessionId: null,
  elapsed: 0,
  subject: '',
  categoryId: null,
  groupId: null,
  intervalRef: null,
  pomodoroCount: 0,
  pomodoroWorkMin: 25,
  pomodoroBreakMin: 5,

  setSubject: (subject) => set({ subject }),

  tick: () => set((s) => ({ elapsed: s.elapsed + 1 })),

  start: async (subject = '', categoryId = null, isPomodoro = false, groupId = null) => {
    const { data } = await trackingApi.startSession({
      subject,
      categoryId,
      type: isPomodoro ? 'POMODORO' : (groupId ? 'GROUP' : 'FOCUS'),
      isPomodoro,
      groupId: groupId ?? undefined,
    })

    const intervalRef = setInterval(() => get().tick(), 1000)

    set({
      mode: isPomodoro ? 'pomodoro_work' : 'running',
      sessionId: data.data.id,
      elapsed: 0,
      subject,
      categoryId,
      groupId,
      intervalRef,
    })
  },

  stop: async () => {
    const { sessionId, intervalRef } = get()
    if (intervalRef) clearInterval(intervalRef)

    if (sessionId) {
      await trackingApi.stopSession(sessionId).catch(console.error)
    }

    set({ mode: 'idle', sessionId: null, elapsed: 0, intervalRef: null, pomodoroCount: 0, groupId: null })
  },

  pause: () => {
    const { intervalRef } = get()
    if (intervalRef) clearInterval(intervalRef)
    set({ mode: 'paused', intervalRef: null })
  },

  resume: () => {
    const intervalRef = setInterval(() => get().tick(), 1000)
    set({ mode: 'running', intervalRef })
  },

  reset: () => {
    const { intervalRef } = get()
    if (intervalRef) clearInterval(intervalRef)
    set({ mode: 'idle', sessionId: null, elapsed: 0, intervalRef: null, groupId: null })
  },
}))

// Helper: format elapsed seconds → HH:MM:SS
export const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
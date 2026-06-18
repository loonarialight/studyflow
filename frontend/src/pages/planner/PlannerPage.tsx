import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Circle, BookOpen, Star, Clock,
  Target, Plus, X, CalendarDays, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { learnApi } from '../../api/admin.api'
import { calendarApi } from '../../api/endpoints'

// ─── Constants ────────────────────────────────────────────────
const DEFENSE_DATE = new Date('2026-06-17T00:00:00')

const getDDay = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((DEFENSE_DATE.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const formatDate = () => {
  const d = new Date()
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return {
    full: `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`,
    day: days[d.getDay()],
    month: months[d.getMonth()],
    date: d.getDate(),
  }
}

const COLORS = [
  { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd' },
  { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' },
  { bg: '#fef9c3', text: '#a16207', border: '#fde047' },
  { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  { bg: '#e0f2fe', text: '#075985', border: '#7dd3fc' },
  { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
]

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5)

const PRIORITY_CONFIG = {
  HIGH:   { label: 'Высокий', color: '#ef4444', bg: '#fef2f2' },
  MEDIUM: { label: 'Средний', color: '#f59e0b', bg: '#fffbeb' },
  LOW:    { label: 'Низкий',  color: '#10b981', bg: '#f0fdf4' },
}

// ─── Task types ───────────────────────────────────────────────
interface LocalTask {
  id: string
  title: string
  subject: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  dueDate: string
  done: boolean
  calendarEventId?: string
}

// ─── Main Page ────────────────────────────────────────────────
export const PlannerPage = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const dday = getDDay()
  const dateInfo = formatDate()

  const [tasks, setTasks] = useState<LocalTask[]>(() => {
    try { return JSON.parse(localStorage.getItem('planner_tasks') || '[]') } catch { return [] }
  })
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showCompleted, setShowCompleted] = useState(true)

  const saveTasks = (updated: LocalTask[]) => {
    setTasks(updated)
    localStorage.setItem('planner_tasks', JSON.stringify(updated))
  }

  // Fetch planner data
  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['planner', 'highschool'],
    queryFn: () => learnApi.getPlanner('highschool').then(r => r.data?.data ?? []),
  })

  // Create calendar event mutation
  const createEventMutation = useMutation({
    mutationFn: (data: any) => calendarApi.createEvent(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-events'] }),
  })

  const allLessons = (subjects as any[]).flatMap((s: any) =>
    s.chapters?.flatMap((c: any) => c.lessons ?? []) ?? []
  )
  const completedLessons = allLessons.filter((l: any) => l.progress?.isCompleted)
  const totalCount = allLessons.length

  // Task actions
  const addTask = async (form: Omit<LocalTask, 'id' | 'done'>) => {
    const newTask: LocalTask = { ...form, id: Date.now().toString(), done: false }

    // Sync to calendar if dueDate is set
    if (form.dueDate) {
      try {
        const startAt = new Date(form.dueDate)
        const endAt = new Date(startAt.getTime() + 60 * 60 * 1000)
        const res = await createEventMutation.mutateAsync({
          title: form.title,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          type: 'STUDY',
          color: '#7c3aed',
          description: `Задача: ${form.subject} · Приоритет: ${form.priority}`,
        })
        newTask.calendarEventId = res?.data?.data?.id
        toast.success('Задача добавлена в календарь 📅')
      } catch {
        toast.success('Задача создана')
      }
    } else {
      toast.success('Задача создана')
    }

    saveTasks([...tasks, newTask])
    setShowTaskForm(false)
  }

  const toggleTask = (id: string) => {
    saveTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const deleteTask = (id: string) => {
    saveTasks(tasks.filter(t => t.id !== id))
  }

  const pendingTasks = tasks.filter(t => !t.done)
  const doneTasks = tasks.filter(t => t.done)

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 50%, #fefce8 100%)',
        fontFamily: "'Noto Sans KR', 'Segoe UI', sans-serif",
      }}
    >
      <div className="max-w-6xl mx-auto space-y-4">

        {/* ── Header ── */}
        <div
          className="rounded-2xl p-5 border"
          style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', borderColor: '#e9d5ff' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium tracking-widest text-purple-400 uppercase mb-0.5">
                {dateInfo.day} · {dateInfo.month} {dateInfo.date}
              </p>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: '#1e1b4b', letterSpacing: '-0.03em' }}>
                {dateInfo.full}
              </h1>
            </div>

            <div
              className="flex flex-col items-center justify-center rounded-2xl px-6 py-3"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', minWidth: 110 }}
            >
              <p className="text-xs text-purple-200 font-medium tracking-widest">DEFENSE</p>
              <p className="text-3xl font-black text-white leading-none">D-{dday}</p>
            </div>

            <div className="text-right">
              <p className="text-xs font-medium text-purple-400 mb-0.5 flex items-center gap-1 justify-end">
                <Clock size={11} /> ПРОГРЕСС
              </p>
              <p className="text-2xl font-black" style={{ color: '#1e1b4b' }}>
                {completedLessons.length}/{totalCount}
              </p>
              <p className="text-xs text-purple-400">уроков завершено</p>
            </div>
          </div>

          <div
            className="mt-3 rounded-xl px-4 py-2.5 flex items-center gap-2"
            style={{ background: '#faf5ff', border: '1px dashed #c4b5fd' }}
          >
            <Star size={13} className="text-purple-400 flex-shrink-0" />
            <p className="text-sm text-purple-700 font-medium">
              Цель: получить 5+ за дипломную работу · Защита 17 июня 2026
            </p>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 220px' }}>

          {/* ── Left column ── */}
          <div className="space-y-4">

            {/* ── Custom Tasks ── */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.85)', borderColor: '#e9d5ff' }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: '#f3e8ff' }}
              >
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-purple-500" />
                  <span className="text-xs font-bold tracking-widest uppercase text-purple-500">МОИ ЗАДАЧИ</span>
                  {pendingTasks.length > 0 && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: '#ede9fe', color: '#7c3aed' }}
                    >
                      {pendingTasks.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowTaskForm(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                  style={{ background: '#ede9fe', color: '#7c3aed' }}
                >
                  <Plus size={13} /> Добавить
                </button>
              </div>

              {/* Task form */}
              {showTaskForm && (
                <TaskForm
                  subjects={(subjects as any[]).map((s: any) => s.name)}
                  onSave={addTask}
                  onClose={() => setShowTaskForm(false)}
                  isPending={createEventMutation.isPending}
                />
              )}

              {/* Pending tasks */}
              {pendingTasks.length === 0 && !showTaskForm ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm text-purple-200">Нет активных задач</p>
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="mt-2 text-xs text-purple-400 hover:text-purple-600 underline"
                  >
                    + Создать первую задачу
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-purple-50">
                  {pendingTasks.map(task => (
                    <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                  ))}
                </div>
              )}

              {/* Done tasks */}
              {doneTasks.length > 0 && (
                <div className="border-t" style={{ borderColor: '#f3e8ff' }}>
                  <button
                    onClick={() => setShowCompleted(v => !v)}
                    className="w-full flex items-center gap-2 px-5 py-2.5 text-xs text-purple-300 hover:text-purple-500 transition-colors"
                  >
                    {showCompleted ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    Выполнено ({doneTasks.length})
                  </button>
                  {showCompleted && doneTasks.map(task => (
                    <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Completed Lessons ── */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.75)', borderColor: '#e9d5ff' }}
            >
              <div
                className="flex items-center gap-2 px-5 py-3 border-b"
                style={{ borderColor: '#f3e8ff' }}
              >
                <CheckCircle2 size={14} className="text-green-500" />
                <span className="text-xs font-bold tracking-widest uppercase text-green-600">ПРОЙДЕННЫЕ ТЕМЫ</span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full ml-auto"
                  style={{ background: '#dcfce7', color: '#166534' }}
                >
                  {completedLessons.length}/{totalCount}
                </span>
              </div>

              {isLoading ? (
                <div className="px-5 py-8 text-center">
                  <div className="w-7 h-7 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin mx-auto mb-2" />
                </div>
              ) : completedLessons.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <BookOpen size={28} className="text-purple-200 mx-auto mb-2" />
                  <p className="text-sm text-purple-300">Пока нет завершённых уроков</p>
                  <button
                    onClick={() => navigate('/learn')}
                    className="mt-2 text-xs text-purple-400 hover:text-purple-600 underline"
                  >
                    Перейти к урокам →
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-purple-50">
                  {(subjects as any[]).map((subject: any, si: number) => {
                    const color = COLORS[si % COLORS.length]
                    const lessons = subject.chapters?.flatMap((ch: any) => ch.lessons ?? []) ?? []
                    const completed = lessons.filter((l: any) => l.progress?.isCompleted)
                    if (completed.length === 0) return null
                    return (
                      <div key={subject.id}>
                        <div className="px-5 py-2 flex items-center gap-2">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-md"
                            style={{ background: color.bg, color: color.text }}
                          >
                            {subject.icon} {subject.name}
                          </span>
                          <span className="text-xs text-purple-300">{completed.length} урока</span>
                        </div>
                        {completed.map((lesson: any) => (
                          <button
                            key={lesson.id}
                            onClick={() => navigate(`/learn/lessons/${lesson.id}`)}
                            className="w-full flex items-center gap-3 px-5 py-2 hover:bg-green-50 transition-colors text-left border-t"
                            style={{ borderColor: '#f0fdf4' }}
                          >
                            <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                            <span className="flex-1 text-sm text-gray-500 line-through">{lesson.title}</span>
                            {lesson.progress?.score != null && (
                              <span className="text-xs font-semibold text-green-600 flex-shrink-0">
                                {lesson.progress.score}pts
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-4">

            {/* Timetable */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.75)', borderColor: '#e9d5ff' }}
            >
              <div
                className="px-3 py-2.5 border-b text-xs font-semibold tracking-widest uppercase text-center"
                style={{ borderColor: '#f3e8ff', color: '#a78bfa' }}
              >
                TIMETABLE
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="grid border-b"
                    style={{
                      gridTemplateColumns: '28px 1fr',
                      borderColor: hour % 3 === 0 ? '#e9d5ff' : '#f5f0ff',
                      minHeight: 26,
                    }}
                  >
                    <div
                      className="flex items-center justify-center border-r"
                      style={{
                        borderColor: '#e9d5ff',
                        color: hour % 3 === 0 ? '#7c3aed' : '#c4b5fd',
                        fontWeight: hour % 3 === 0 ? 600 : 400,
                        fontSize: 10,
                      }}
                    >
                      {hour}
                    </div>
                    <div className="grid grid-cols-6">
                      {Array(6).fill(0).map((_, i) => (
                        <div key={i} className="border-r last:border-r-0" style={{ borderColor: '#f3e8ff' }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress bars */}
            <div
              className="rounded-2xl border p-3"
              style={{ background: 'rgba(255,255,255,0.75)', borderColor: '#e9d5ff' }}
            >
              <p className="text-xs text-purple-400 mb-3 font-semibold tracking-widest uppercase">PROGRESS</p>
              {(subjects as any[]).slice(0, 5).map((s: any, i: number) => {
                const color = COLORS[i % COLORS.length]
                const lessons = s.chapters?.flatMap((ch: any) => ch.lessons ?? []) ?? []
                const done = lessons.filter((l: any) => l.progress?.isCompleted).length
                const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0
                return (
                  <div key={s.id} className="mb-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate" style={{ color: color.text, maxWidth: 130 }}>
                        {s.icon} {s.name}
                      </span>
                      <span className="text-xs font-bold ml-1" style={{ color: color.text }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: color.bg }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color.border }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tasks summary */}
            <div
              className="rounded-2xl border p-3"
              style={{ background: 'rgba(255,255,255,0.75)', borderColor: '#e9d5ff' }}
            >
              <p className="text-xs text-purple-400 mb-2 font-semibold tracking-widest uppercase">ЗАДАЧИ</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Активных</span>
                  <span className="font-bold text-purple-600">{pendingTasks.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Выполнено</span>
                  <span className="font-bold text-green-600">{doneTasks.length}</span>
                </div>
                {pendingTasks.filter(t => t.priority === 'HIGH').length > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-red-400">🔴 Срочных</span>
                    <span className="font-bold text-red-500">
                      {pendingTasks.filter(t => t.priority === 'HIGH').length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TaskRow ──────────────────────────────────────────────────
const TaskRow = ({ task, onToggle, onDelete }: {
  task: LocalTask
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) => {
  const p = PRIORITY_CONFIG[task.priority]
  const isOverdue = task.dueDate && !task.done && new Date(task.dueDate) < new Date()

  return (
    <div
      className="flex items-center gap-3 px-5 py-3 hover:bg-purple-50 transition-colors group"
      style={{ borderColor: '#faf5ff' }}
    >
      <button onClick={() => onToggle(task.id)} className="flex-shrink-0">
        {task.done
          ? <CheckCircle2 size={17} className="text-green-500" />
          : <Circle size={17} className="text-gray-300 hover:text-purple-400 transition-colors" />
        }
      </button>

      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{
            color: task.done ? '#a78bfa' : '#374151',
            textDecoration: task.done ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.subject && (
            <span className="text-xs text-purple-400">{task.subject}</span>
          )}
          {task.dueDate && (
            <span className={`text-xs flex items-center gap-0.5 ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
              <CalendarDays size={10} />
              {new Date(task.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              {task.calendarEventId && <span className="text-purple-400">· 📅</span>}
            </span>
          )}
        </div>
      </div>

      <span
        className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
        style={{ background: p.bg, color: p.color }}
      >
        {task.priority === 'HIGH' ? '🔴' : task.priority === 'MEDIUM' ? '🟡' : '🟢'}
      </span>

      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded hover:bg-red-50"
      >
        <Trash2 size={13} className="text-red-400" />
      </button>
    </div>
  )
}

// ─── TaskForm ─────────────────────────────────────────────────
const TaskForm = ({ subjects, onSave, onClose, isPending }: {
  subjects: string[]
  onSave: (f: Omit<LocalTask, 'id' | 'done'>) => void
  onClose: () => void
  isPending: boolean
}) => {
  const [form, setForm] = useState({
    title: '',
    subject: subjects[0] ?? '',
    priority: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW',
    dueDate: '',
  })
  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: '#f3e8ff', background: '#faf5ff' }}>
      <input
        value={form.title}
        onChange={e => upd('title', e.target.value)}
        placeholder="Название задачи..."
        autoFocus
        className="w-full text-sm border rounded-xl px-3 py-2 focus:outline-none focus:border-purple-400"
        style={{ borderColor: '#e9d5ff' }}
      />

      <div className="grid grid-cols-2 gap-2">
        {/* Subject */}
        <div>
          <label className="text-xs text-purple-400 mb-1 block">Предмет</label>
          <select
            value={form.subject}
            onChange={e => upd('subject', e.target.value)}
            className="w-full text-sm border rounded-xl px-3 py-2 focus:outline-none bg-white"
            style={{ borderColor: '#e9d5ff' }}
          >
            <option value="">— без предмета —</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs text-purple-400 mb-1 block">Приоритет</label>
          <select
            value={form.priority}
            onChange={e => upd('priority', e.target.value)}
            className="w-full text-sm border rounded-xl px-3 py-2 focus:outline-none bg-white"
            style={{ borderColor: '#e9d5ff' }}
          >
            <option value="HIGH">🔴 Высокий</option>
            <option value="MEDIUM">🟡 Средний</option>
            <option value="LOW">🟢 Низкий</option>
          </select>
        </div>
      </div>

      {/* Due date */}
      <div>
        <label className="text-xs text-purple-400 mb-1 flex items-center gap-1">
          <CalendarDays size={10} /> Дедлайн (добавится в календарь)
        </label>
        <input
          type="datetime-local"
          value={form.dueDate}
          onChange={e => upd('dueDate', e.target.value)}
          className="w-full text-sm border rounded-xl px-3 py-2 focus:outline-none"
          style={{ borderColor: '#e9d5ff' }}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => form.title && onSave(form)}
          disabled={!form.title || isPending}
          className="flex-1 text-sm font-semibold py-2 rounded-xl text-white transition-opacity disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
        >
          {isPending ? 'Создание...' : '+ Создать задачу'}
        </button>
        <button
          onClick={onClose}
          className="px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

export default PlannerPage
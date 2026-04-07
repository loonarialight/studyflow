import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Plus, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle,
  Flag, Bell, Clock, X, Tag, Palette, Sparkles, Trash2,
  ChevronDown, Calendar, LayoutGrid, List,
} from 'lucide-react'
import {
  format, startOfWeek, addDays, isSameDay, differenceInDays, addMinutes,
  startOfMonth, endOfMonth, eachDayOfInterval, addMonths, addWeeks,
  startOfDay, endOfDay, isSameMonth,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { calendarApi } from '../../api/endpoints'
import { Card, Button, Spinner } from '../../shared/components/ui'
import { AIScheduleImport } from '@/pages/more/AIScheduleImport'

// ── Constants ─────────────────────────────────────────────────────────────────

const ROW_H = 72
const MIN_H = 36
const HOURS = Array.from({ length: 24 }, (_, i) => i)

type CalendarView = 'day' | '3days' | 'week' | 'month'
type EventStatus = 'done' | 'partial' | 'postponed' | null
interface DDaySettings { deadline: string; reminder: string }
interface EventMeta    { status: EventStatus; dday?: DDaySettings }
interface TimeOverride { startAt: Date; endAt: Date; colIndex: number }

const VIEW_OPTIONS: { key: CalendarView; label: string; shortcut: string }[] = [
  { key: 'day',    label: 'День',      shortcut: 'D' },
  { key: '3days',  label: '3 дня',     shortcut: 'X' },
  { key: 'week',   label: 'Неделя',    shortcut: 'W' },
  { key: 'month',  label: 'Месяц',     shortcut: 'M' },
]

const TAG_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  STUDY:    { label: 'Study',    color: '#7C6FE0', bg: '#7C6FE015' },
  TEST:     { label: 'Test',     color: '#EF4444', bg: '#EF444415' },
  CLASS:    { label: 'Class',    color: '#3B82F6', bg: '#3B82F615' },
  PERSONAL: { label: 'Personal', color: '#10B981', bg: '#10B98115' },
  GROUP:    { label: 'Group',    color: '#F59E0B', bg: '#F59E0B15' },
}
const STATUS_CONFIG = {
  done:      { Icon: CheckCircle2,  color: '#10B981', label: 'Done' },
  partial:   { Icon: AlertTriangle, color: '#F59E0B', label: 'In progress' },
  postponed: { Icon: XCircle,       color: '#EF4444', label: 'Postponed' },
} as const
const STATUS_CYCLE: EventStatus[] = [null, 'done', 'partial', 'postponed']
const EVENT_COLORS = ['#7C6FE0','#EF4444','#3B82F6','#10B981','#F59E0B','#8B5CF6','#EC4899','#06B6D4']

// ── Helpers ───────────────────────────────────────────────────────────────────

function toTop(d: Date) { return (d.getHours() + d.getMinutes() / 60) * ROW_H }
function toHeight(s: Date, e: Date) {
  return Math.max((e.getTime() - s.getTime()) / 3_600_000 * ROW_H, MIN_H)
}
function snapMin(d: Date, step = 15) {
  const copy = new Date(d)
  copy.setMinutes(Math.round(copy.getMinutes() / step) * step, 0, 0)
  return copy
}

function getViewDays(view: CalendarView, currentDate: Date): Date[] {
  switch (view) {
    case 'day':
      return [startOfDay(currentDate)]
    case '3days':
      return [0, 1, 2].map(i => addDays(startOfDay(currentDate), i))
    case 'week': {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 })
      return Array.from({ length: 7 }, (_, i) => addDays(ws, i))
    }
    case 'month':
      return [] // handled separately
  }
}

function navigateDate(view: CalendarView, date: Date, dir: 1 | -1): Date {
  switch (view) {
    case 'day':   return addDays(date, dir)
    case '3days': return addDays(date, dir * 3)
    case 'week':  return addWeeks(date, dir)
    case 'month': return addMonths(date, dir)
  }
}

// ── View Switcher Dropdown ────────────────────────────────────────────────────

function ViewSwitcher({ view, onChange }: { view: CalendarView; onChange: (v: CalendarView) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      const found = VIEW_OPTIONS.find(v => v.shortcut === e.key.toUpperCase())
      if (found) onChange(found.key)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onChange])

  const current = VIEW_OPTIONS.find(v => v.key === view)!

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
      >
        <span>{current.label}</span>
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 py-1"
          >
            {VIEW_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => { onChange(opt.key); setOpen(false) }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors
                  ${view === opt.key
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span>{opt.label}</span>
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded-md
                  ${view === opt.key ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                  {opt.shortcut}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── D-Day Popup ───────────────────────────────────────────────────────────────

function DDayPopup({ settings, color, onSave, onClose }: {
  settings?: DDaySettings; color: string
  onSave: (s: DDaySettings) => void; onClose: () => void
}) {
  const [deadline, setDeadline] = useState(settings?.deadline ?? '')
  const [reminder, setReminder] = useState(settings?.reminder ?? '1_day')
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.93, y: -4 }}
      transition={{ duration: 0.12 }}
      className="absolute z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-60 top-full mt-1 left-0"
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Flag size={12} style={{ color }} />
          <span className="text-xs font-semibold text-gray-800">D-Day Settings</span>
        </div>
        <button onClick={onClose} className="p-0.5 rounded-lg hover:bg-gray-100 transition-colors">
          <X size={12} className="text-gray-400" />
        </button>
      </div>
      <div className="space-y-2.5">
        <div>
          <label className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
            <Clock size={9} /> Deadline
          </label>
          <input type="datetime-local" value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300/60" />
        </div>
        <div>
          <label className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
            <Bell size={9} /> Reminder
          </label>
          <select value={reminder} onChange={e => setReminder(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300/60">
            <option value="15_min">15 min before</option>
            <option value="30_min">30 min before</option>
            <option value="1_hour">1 hour before</option>
            <option value="1_day">1 day before</option>
            <option value="3_days">3 days before</option>
            <option value="1_week">1 week before</option>
          </select>
        </div>
        <div className="flex gap-1.5 pt-0.5">
          <button onClick={() => onSave({ deadline, reminder })}
            className="flex-1 text-xs font-medium rounded-lg py-1.5 text-white hover:opacity-90 active:scale-95 transition-all"
            style={{ backgroundColor: color }}>
            Save
          </button>
          <button onClick={onClose}
            className="text-xs px-3 rounded-lg py-1.5 text-gray-500 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Event Block ───────────────────────────────────────────────────────────────

function EventBlock({
  event, startAt, endAt, meta, ddayOpen,
  onStatusCycle, onDDayToggle, onDDaySave, onDDayClose,
  onDragStart, onResizeStart, onDelete,
}: {
  event: any; startAt: Date; endAt: Date; meta: EventMeta
  ddayOpen: boolean
  onStatusCycle: () => void; onDDayToggle: () => void
  onDDaySave: (s: DDaySettings) => void; onDDayClose: () => void
  onDragStart: (e: React.PointerEvent) => void
  onResizeStart: (e: React.PointerEvent) => void
  onDelete: () => void
}) {
  const color     = event.color || '#7C6FE0'
  const top       = toTop(startAt)
  const height    = toHeight(startAt, endAt)
  const compact   = height < 52
  const statusCfg = meta.status ? STATUS_CONFIG[meta.status] : null
  const dday = meta.dday?.deadline
    ? differenceInDays(new Date(meta.dday.deadline), new Date())
    : null
  const tag = event.type ? TAG_CONFIG[event.type as string] : null
  const timeLabel = `${format(startAt, 'HH:mm')} – ${format(endAt, 'HH:mm')}`

  return (
    <div className="absolute left-1 right-1 group" style={{ top, height, zIndex: 10 }}>
      <div
        className="relative w-full h-full rounded-xl overflow-visible cursor-grab active:cursor-grabbing select-none"
        style={{
          backgroundColor: color + '18',
          borderLeft: `3px solid ${color}`,
          boxShadow: `0 1px 6px ${color}1A`,
        }}
        onPointerDown={onDragStart}
      >
        <div className="flex flex-col h-full px-3 pt-2 pb-4 min-w-0">
          <div className="flex items-start gap-1 min-w-0">
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onStatusCycle() }}
              className="shrink-0 mt-0.5 opacity-50 hover:opacity-100 transition-opacity"
            >
              {statusCfg
                ? <statusCfg.Icon size={11} color={statusCfg.color} />
                : <div className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: color }} />
              }
            </button>
            <span
              className="text-sm font-semibold truncate flex-1 leading-5"
              style={{
                color,
                textDecoration: meta.status === 'done' ? 'line-through' : 'none',
                opacity: meta.status === 'done' ? 0.55 : 1,
              }}
            >
              {event.title}
            </span>
            {dday !== null ? (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onDDayToggle() }}
                className="shrink-0 font-bold rounded px-1 text-[9px] leading-4 hover:scale-105 transition-transform"
                style={{
                  backgroundColor: dday < 0 ? '#EF444422' : dday <= 3 ? '#F59E0B22' : color + '22',
                  color: dday < 0 ? '#EF4444' : dday <= 3 ? '#D97706' : color,
                }}
              >
                {dday === 0 ? 'D-Day' : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`}
              </button>
            ) : (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onDDayToggle() }}
                className="shrink-0 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
              >
                <Flag size={10} style={{ color }} />
              </button>
            )}
            {/* Delete button — top-right corner, visible on hover */}
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity ml-0.5 p-0.5 rounded hover:bg-red-100"
              title="Удалить"
            >
              <Trash2 size={11} className="text-red-400" />
            </button>
          </div>
          {!compact && (
            <div className="flex items-center gap-1.5 mt-0.5 pl-3.5">
              <span className="text-xs opacity-60" style={{ color }}>{timeLabel}</span>
              {tag && (
                <span className="text-[11px] font-medium rounded-full px-2 py-0.5 leading-4"
                  style={{ backgroundColor: color + '22', color }}>
                  {tag.label}
                </span>
              )}
            </div>
          )}
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-3 flex items-center justify-center cursor-s-resize opacity-0 group-hover:opacity-100 transition-opacity"
          onPointerDown={e => { e.stopPropagation(); onResizeStart(e) }}
        >
          <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: color + '90' }} />
        </div>
      </div>
      <AnimatePresence>
        {ddayOpen && (
          <DDayPopup settings={meta.dday} color={color}
            onSave={onDDaySave} onClose={onDDayClose} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Month View ────────────────────────────────────────────────────────────────

function MonthView({ currentDate, events, eventMeta, onStatusCycle }: {
  currentDate: Date
  events: any[]
  eventMeta: Record<string, EventMeta>
  onStatusCycle: (id: string) => void
}) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd   = endOfMonth(currentDate)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = addDays(startOfWeek(monthEnd, { weekStartsOn: 1 }), 6)
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-primary-50">
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map(day => {
          const isToday   = isSameDay(day, new Date())
          const isCurrentMonth = isSameMonth(day, currentDate)
          const dayEvents = events.filter(e => isSameDay(new Date(e.startAt), day))

          return (
            <div key={day.toISOString()}
              className={`min-h-[90px] border-b border-r border-primary-50 p-1.5
                ${isToday ? 'bg-primary-50/40' : ''}
                ${!isCurrentMonth ? 'opacity-35' : ''}`}
            >
              <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 mx-auto
                ${isToday ? 'bg-primary-600 text-white' : 'text-gray-700'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(event => {
                  const color = event.color || '#7C6FE0'
                  const meta  = eventMeta[event.id] ?? { status: null }
                  return (
                    <div key={event.id}
                      onClick={() => onStatusCycle(event.id)}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: color + '20' }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-[10px] font-medium truncate" style={{ color }}>
                        {event.title}
                      </span>
                      {meta.status && (
                        <span className="shrink-0">
                          {meta.status === 'done' && <CheckCircle2 size={8} color="#10B981" />}
                          {meta.status === 'partial' && <AlertTriangle size={8} color="#F59E0B" />}
                          {meta.status === 'postponed' && <XCircle size={8} color="#EF4444" />}
                        </span>
                      )}
                    </div>
                  )
                })}
                {dayEvents.length > 3 && (
                  <p className="text-[9px] text-gray-400 pl-1">+{dayEvents.length - 3} ещё</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Create Event Form ─────────────────────────────────────────────────────────

function CreateEventForm({ onClose, onSave, isPending }: {
  onClose: () => void; onSave: (f: any) => void; isPending: boolean
}) {
  const [form, setForm] = useState({
    title: '', startAt: '', endAt: '', type: 'STUDY',
    color: '#7C6FE0', description: '', syncGoogle: false,
  })
  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.14 }}
    >
      <Card className="p-5 space-y-3.5 border-primary-100 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">New Event</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={15} className="text-gray-400" />
          </button>
        </div>
        <input value={form.title} onChange={e => upd('title', e.target.value)}
          placeholder="Event title" className="input w-full" autoFocus />
        <input value={form.description} onChange={e => upd('description', e.target.value)}
          placeholder="Description (optional)" className="input w-full" />
        <div className="grid grid-cols-2 gap-3">
          {(['startAt', 'endAt'] as const).map(k => (
            <div key={k}>
              <label className="text-[10px] text-gray-400 mb-1 block">
                {k === 'startAt' ? 'Start' : 'End'}
              </label>
              <input type="datetime-local" value={form[k]}
                onChange={e => upd(k, e.target.value)} className="input w-full text-xs" />
            </div>
          ))}
        </div>
        <div>
          <label className="flex items-center gap-1 text-[10px] text-gray-400 mb-1.5">
            <Tag size={9} /> Category
          </label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(TAG_CONFIG).map(([key, { label, color, bg }]) => (
              <button key={key}
                onClick={() => { upd('type', key); upd('color', color) }}
                className="text-xs px-2.5 py-1 rounded-full font-medium transition-all hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: form.type === key ? color : bg,
                  color: form.type === key ? '#fff' : color,
                  border: `1px solid ${color}40`,
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="flex items-center gap-1 text-[10px] text-gray-400 mb-1.5">
            <Palette size={9} /> Color
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {EVENT_COLORS.map(c => (
              <button key={c} onClick={() => upd('color', c)}
                className="w-5 h-5 rounded-full transition-all hover:scale-110"
                style={{
                  backgroundColor: c,
                  outline: form.color === c ? `2px solid ${c}` : '2px solid transparent',
                  outlineOffset: 2,
                }} />
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={form.syncGoogle}
            onChange={e => upd('syncGoogle', e.target.checked)} className="rounded accent-violet-600" />
          Sync to Google Calendar
        </label>
        <div className="flex gap-2 pt-1">
          <Button onClick={() => onSave(form)} loading={isPending}
            disabled={!form.title || !form.startAt || !form.endAt} className="flex-1">
            Save
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </Card>
    </motion.div>
  )
}

// ── Status Legend ─────────────────────────────────────────────────────────────

function StatusLegend() {
  return (
    <div className="flex items-center gap-3 text-xs text-gray-500">
      {Object.entries(STATUS_CONFIG).map(([key, { Icon, color, label }]) => (
        <div key={key} className="flex items-center gap-1">
          <Icon size={11} color={color} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Time Grid (Day / 3days / Week) ────────────────────────────────────────────

function TimeGrid({ weekDays, events, eventMeta, ddayOpenId, overrides, gridRef,
  setDDayOpenId, cycleStatus, saveDDay, startDrag, onDelete
}: {
  weekDays: Date[]
  events: any[]
  eventMeta: Record<string, EventMeta>
  ddayOpenId: string | null
  overrides: Record<string, TimeOverride>
  gridRef: React.RefObject<HTMLDivElement>
  setDDayOpenId: (id: string | null) => void
  cycleStatus: (id: string) => void
  saveDDay: (id: string, s: DDaySettings) => void
  startDrag: (e: React.PointerEvent, event: any, type: 'move' | 'resize', colIndex: number) => void
  onDelete: (id: string) => void
}) {
  const getEventPos = (event: any): { startAt: Date; endAt: Date; colIndex: number } => {
    const ov = overrides[event.id]
    if (ov) return { startAt: ov.startAt, endAt: ov.endAt, colIndex: ov.colIndex }
    const s   = new Date(event.startAt)
    const end = new Date(event.endAt)
    const col = weekDays.findIndex(d => isSameDay(d, s))
    return { startAt: s, endAt: end, colIndex: col < 0 ? -1 : col }
  }

  const cols = weekDays.length

  return (
    <div className="overflow-y-auto max-h-[640px]">
      <div ref={gridRef} className={`grid`}
        style={{ gridTemplateColumns: `48px repeat(${cols}, 1fr)`, height: 24 * ROW_H }}>
        {/* Hour labels */}
        <div className="relative border-r border-primary-50">
          {HOURS.map(h => (
            <div key={h}
              className="absolute w-full flex items-start justify-end pr-2 text-xs text-gray-300"
              style={{ top: h * ROW_H, height: ROW_H }}>
              {h !== 0 && <span className="mt-0.5">{h}:00</span>}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day, colIndex) => {
          const isToday   = isSameDay(day, new Date())
          const colEvents = events.filter(e => getEventPos(e).colIndex === colIndex)
          return (
            <div key={day.toISOString()}
              className={`relative border-l border-primary-50 ${isToday ? 'bg-primary-50/25' : ''}`}
              style={{ height: 24 * ROW_H }}>
              {HOURS.map(h => (
                <div key={h} className="absolute left-0 right-0 border-b border-primary-50/50"
                  style={{ top: h * ROW_H, height: ROW_H }} />
              ))}
              {colEvents.map((event: any) => {
                const pos = getEventPos(event)
                return (
                  <EventBlock
                    key={event.id}
                    event={event}
                    startAt={pos.startAt}
                    endAt={pos.endAt}
                    meta={eventMeta[event.id] ?? { status: null }}
                    ddayOpen={ddayOpenId === event.id}
                    onStatusCycle={() => cycleStatus(event.id)}
                    onDDayToggle={() => setDDayOpenId(ddayOpenId === event.id ? null : event.id)}
                    onDDaySave={s => saveDDay(event.id, s)}
                    onDDayClose={() => setDDayOpenId(null)}
                    onDragStart={e => startDrag(e, event, 'move', colIndex)}
                    onResizeStart={e => startDrag(e, event, 'resize', colIndex)}
                    onDelete={() => onDelete(event.id)}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView]               = useState<CalendarView>('week')
  const [showForm, setShowForm]       = useState(false)
  const [showAIImport, setShowAIImport] = useState(false)
  const [ddayOpenId, setDDayOpenId]   = useState<string | null>(null)
  const [eventMeta, setEventMeta]     = useState<Record<string, EventMeta>>({})
  const [overrides, setOverrides]     = useState<Record<string, TimeOverride>>({})

  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    type: 'move' | 'resize'
    eventId: string
    startY: number; startX: number
    origStart: Date; origEnd: Date
    origColIndex: number
    colWidth: number
  } | null>(null)

  const qc       = useQueryClient()
  const weekDays = view === 'month' ? [] : getViewDays(view, currentDate)

  // Date range for fetching
  const fetchFrom = view === 'month'
    ? startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
    : (weekDays[0] ?? startOfDay(currentDate))
  const fetchTo = view === 'month'
    ? addDays(startOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }), 7)
    : addDays(weekDays[weekDays.length - 1] ?? startOfDay(currentDate), 1)

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar-events', format(fetchFrom, 'yyyy-MM-dd'), view],
    queryFn: () =>
      calendarApi.getEvents({
        from: fetchFrom.toISOString(),
        to:   fetchTo.toISOString(),
      }).then((r: any) => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (form: any) => calendarApi.createEvent(form),
    onSuccess: () => {
      toast.success('Event created!')
      qc.invalidateQueries({ queryKey: ['calendar-events'] })
      setShowForm(false)
    },
    onError: () => toast.error('Failed to create event'),
  })

  const syncMutation = useMutation({
    mutationFn: () => calendarApi.syncFromGoogle(),
    onSuccess: (r: any) => {
      toast.success(`Synced ${r.data.data.synced} events`)
      qc.invalidateQueries({ queryKey: ['calendar-events'] })
    },
    onError: () => toast.error('Google Calendar not connected'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => calendarApi.deleteEvent(id),
    onSuccess: () => {
      toast.success('Событие удалено', { duration: 2000 })
      qc.invalidateQueries({ queryKey: ['calendar-events'] })
    },
    onError: () => toast.error('Не удалось удалить'),
  })

  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const dy = e.clientY - d.startY
    const dx = e.clientX - d.startX

    if (d.type === 'move') {
      const deltaH    = dy / ROW_H
      const deltaCols = Math.round(dx / d.colWidth)
      const newCol    = Math.max(0, Math.min(weekDays.length - 1, d.origColIndex + deltaCols))
      const duration  = d.origEnd.getTime() - d.origStart.getTime()
      const newStart  = snapMin(new Date(d.origStart.getTime() + deltaH * 3_600_000))
      const newEnd    = new Date(newStart.getTime() + duration)
      const targetDay = weekDays[newCol]
      newStart.setFullYear(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate())
      newEnd.setFullYear(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate())
      setOverrides(p => ({ ...p, [d.eventId]: { startAt: newStart, endAt: newEnd, colIndex: newCol } }))
    } else {
      const deltaH = dy / ROW_H
      let newEnd = snapMin(new Date(d.origEnd.getTime() + deltaH * 3_600_000))
      if (newEnd.getTime() - d.origStart.getTime() < 15 * 60_000)
        newEnd = addMinutes(d.origStart, 15)
      setOverrides(p => ({ ...p, [d.eventId]: { startAt: d.origStart, endAt: newEnd, colIndex: d.origColIndex } }))
    }
  }, [weekDays])

  const onPointerUp = useCallback(() => {
    if (dragRef.current) {
      toast.success(dragRef.current.type === 'move' ? 'Event moved' : 'Event resized', { duration: 1200 })
      dragRef.current = null
    }
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [onPointerMove])

  const startDrag = useCallback((
    e: React.PointerEvent, event: any, type: 'move' | 'resize', colIndex: number,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setDDayOpenId(null)
    const ov        = overrides[event.id]
    const origStart = ov ? new Date(ov.startAt) : new Date(event.startAt)
    const origEnd   = ov ? new Date(ov.endAt)   : new Date(event.endAt)
    const colWidth  = gridRef.current ? gridRef.current.offsetWidth / weekDays.length : 120
    dragRef.current = { type, eventId: event.id, startY: e.clientY, startX: e.clientX,
      origStart, origEnd, origColIndex: colIndex, colWidth }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }, [overrides, onPointerMove, onPointerUp, weekDays.length])

  const cycleStatus = (id: string) =>
    setEventMeta(p => {
      const curr = p[id]?.status ?? null
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(curr) + 1) % STATUS_CYCLE.length]
      return { ...p, [id]: { ...(p[id] ?? {}), status: next } }
    })

  const saveDDay = (id: string, s: DDaySettings) => {
    setEventMeta(p => ({ ...p, [id]: { ...(p[id] ?? {}), dday: s } }))
    setDDayOpenId(null)
    toast.success('Deadline saved', { duration: 1200 })
  }

  // Header range label
  const rangeLabel = (() => {
    if (view === 'day')   return format(currentDate, 'd MMMM yyyy', { locale: ru })
    if (view === '3days') return `${format(currentDate, 'd')} – ${format(addDays(currentDate, 2), 'd MMM yyyy', { locale: ru })}`
    if (view === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(ws, 'd MMM')} — ${format(addDays(ws, 6), 'd MMM yyyy', { locale: ru })}`
    }
    return format(currentDate, 'LLLL yyyy', { locale: ru })
  })()

  return (
    <div className="p-6 space-y-4 animate-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Календарь</h1>
          <p className="text-sm text-gray-500 capitalize">{rangeLabel}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <StatusLegend />
          <div className="w-px h-5 bg-gray-200 mx-1" />

          <Button variant="outline" size="sm"
            onClick={() => setShowAIImport(true)}
            className="gap-1.5 border-violet-200 text-violet-600 hover:bg-violet-50">
            <Sparkles size={13} /> AI Import
          </Button>

          <Button variant="outline" size="sm"
            onClick={() => syncMutation.mutate()} loading={syncMutation.isPending}
            className="gap-1.5">
            <RefreshCw size={13} /> Sync Google
          </Button>

          <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-1.5">
            <Plus size={14} /> Add event
          </Button>
        </div>
      </div>

      {/* AI Import Modal */}
      <AnimatePresence>
        {showAIImport && (
          <AIScheduleImport
            onClose={() => setShowAIImport(false)}
            onImported={() => {
              qc.invalidateQueries({ queryKey: ['calendar-events'] })
              setShowAIImport(false)
            }}
          />
        )}
      </AnimatePresence>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <CreateEventForm
            onClose={() => setShowForm(false)}
            onSave={f => createMutation.mutate(f)}
            isPending={createMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Nav + View switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(d => navigateDate(view, d, -1))}
            className="p-2 rounded-xl hover:bg-primary-50 transition-colors">
            <ChevronLeft size={17} />
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            className="text-sm font-medium text-primary-600 hover:underline px-1">
            Сегодня
          </button>
          <button onClick={() => setCurrentDate(d => navigateDate(view, d, 1))}
            className="p-2 rounded-xl hover:bg-primary-50 transition-colors">
            <ChevronRight size={17} />
          </button>
        </div>

        <ViewSwitcher view={view} onChange={setView} />
      </div>

      {/* Grid */}
      <Card className="overflow-hidden">
        {view !== 'month' && (
          /* Day headers for time-grid views */
          <div className="border-b border-primary-50"
            style={{ display: 'grid', gridTemplateColumns: `48px repeat(${weekDays.length}, 1fr)` }}>
            <div className="p-3 text-xs text-gray-400" />
            {weekDays.map(day => (
              <div key={day.toISOString()}
                className={`p-3 text-center border-l border-primary-50 ${isSameDay(day, new Date()) ? 'bg-primary-50' : ''}`}>
                <p className="text-xs text-gray-400">{format(day, 'EEE', { locale: ru })}</p>
                <p className={`text-sm font-semibold mt-0.5 ${isSameDay(day, new Date()) ? 'text-primary-600' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </p>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : view === 'month' ? (
          <MonthView
            currentDate={currentDate}
            events={events}
            eventMeta={eventMeta}
            onStatusCycle={cycleStatus}
          />
        ) : (
          <TimeGrid
            weekDays={weekDays}
            events={events}
            eventMeta={eventMeta}
            ddayOpenId={ddayOpenId}
            overrides={overrides}
            gridRef={gridRef}
            setDDayOpenId={setDDayOpenId}
            cycleStatus={cycleStatus}
            saveDDay={saveDDay}
            startDrag={startDrag}
            onDelete={(id: string) => deleteMutation.mutate(id)}
          />
        )}
      </Card>
    </div>
  )
}
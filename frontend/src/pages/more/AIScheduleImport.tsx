import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Sparkles, X, CheckCircle2, Calendar,
  Trash2, Edit2, Check,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { api } from '@/api/client'
import { Button } from '@/shared/components/ui'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedEvent {
  title: string
  description?: string
  startAt: string
  endAt: string
  type: 'STUDY' | 'TEST' | 'CLASS' | 'PERSONAL' | 'GROUP'
  color: string
}

const TYPE_LABELS: Record<string, string> = {
  STUDY: 'Study', TEST: 'Test',
  CLASS: 'Class', PERSONAL: 'Personal', GROUP: 'Group',
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['Input', 'Preview', 'Done']
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => {
        const n      = i + 1
        const done   = n < current
        const active = n === current
        return (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              done   ? 'bg-green-500 text-white' :
              active ? 'bg-primary-600 text-white' :
                       'bg-gray-100 text-gray-400'
            }`}>
              {done ? <Check size={12} /> : n}
            </div>
            <span className={`text-xs font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Event card (editable) ─────────────────────────────────────────────────────

function EventCard({
  event, index, onUpdate, onRemove,
}: {
  event: ParsedEvent
  index: number
  onUpdate: (i: number, e: ParsedEvent) => void
  onRemove: (i: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const color = event.color || '#7C6FE0'

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.15, delay: index * 0.04 }}
      className="rounded-xl border border-gray-100 overflow-hidden shadow-sm"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {!editing ? (
        <div className="flex items-start gap-3 p-3 bg-white">
          <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400">
                {format(parseISO(event.startAt), 'EEE d MMM, HH:mm', { locale: ru })}
                {' – '}
                {format(parseISO(event.endAt), 'HH:mm')}
              </span>
              <span
                className="text-[9px] font-semibold rounded-full px-1.5 py-0.5"
                style={{ backgroundColor: color + '20', color }}
              >
                {TYPE_LABELS[event.type]}
              </span>
            </div>
            {event.description && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{event.description}</p>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Edit2 size={12} className="text-gray-400" />
            </button>
            <button
              onClick={() => onRemove(index)}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={12} className="text-red-400" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-gray-50 space-y-2">
          <input
            value={event.title}
            onChange={e => onUpdate(index, { ...event, title: e.target.value })}
            className="input w-full text-sm"
            placeholder="Title"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 mb-0.5 block">Start</label>
              <input
                type="datetime-local"
                value={event.startAt.slice(0, 16)}
                onChange={e => onUpdate(index, { ...event, startAt: e.target.value + ':00' })}
                className="input w-full text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 mb-0.5 block">End</label>
              <input
                type="datetime-local"
                value={event.endAt.slice(0, 16)}
                onChange={e => onUpdate(index, { ...event, endAt: e.target.value + ':00' })}
                className="input w-full text-xs"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={event.type}
              onChange={e => onUpdate(index, { ...event, type: e.target.value as any })}
              className="input flex-1 text-xs"
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button
              onClick={() => setEditing(false)}
              className="px-3 rounded-xl bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface AIScheduleImportProps {
  onClose: () => void
  onImported: () => void
}

export function AIScheduleImport({ onClose, onImported }: AIScheduleImportProps) {
  const [step, setStep]               = useState<1 | 2 | 3>(1)
  const [text, setText]               = useState('')
  const [loading, setLoading]         = useState(false)
  const [events, setEvents]           = useState<ParsedEvent[]>([])
  const [importing, setImporting]     = useState(false)

  const qc = useQueryClient()

  // ── Step 1: Parse ──────────────────────────────────────────────────────────

  const handleParse = async () => {
    if (!text.trim()) {
      toast.error('Введи текст расписания')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/ai/parse-schedule', { text })
      const parsed: ParsedEvent[] = res.data.data.events

      if (!parsed.length) {
        toast.error('AI не нашёл событий. Попробуй другой формат.')
        return
      }

      setEvents(parsed)
      setStep(2)
      toast.success(`Найдено ${parsed.length} событий!`, { icon: '✨' })
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Ошибка парсинга. Попробуй ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Import ─────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!events.length) return
    setImporting(true)
    try {
      await api.post('/ai/import-events', { events })
      qc.invalidateQueries({ queryKey: ['calendar-events'] })
      setStep(3)
      toast.success(`${events.length} событий добавлено!`, { icon: '🎉' })
    } catch (e: unknown) {
      toast.error('Не удалось сохранить события')
    } finally {
      setImporting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center shadow-sm">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">AI Schedule Import</h2>
              <p className="text-xs text-gray-400">Powered by Groq · Llama 3.3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <Steps current={step} />

          <AnimatePresence mode="wait">

            {/* Step 1 — Text input */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className="space-y-3"
              >
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={
                    'Вставь расписание в любом формате. Например:\n\n' +
                    'Понедельник:\n  09:00–10:30 Математика\n  12:00–13:30 Физика\n\n' +
                    'Tuesday 14:00-15:30 Programming\n' +
                    'Среда 08:00 Лекция по химии'
                  }
                  className="w-full h-52 text-sm border border-gray-200 rounded-2xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-300/60 transition-all font-mono"
                  autoFocus
                />
                <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-50 border border-violet-100">
                  <Sparkles size={13} className="text-violet-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-violet-600">
                    AI понимает любой формат — русский, английский, сокращения, дни недели.
                    Просто вставь как есть.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 2 — Preview & edit */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">
                    Found: <span className="text-primary-600">{events.length} events</span>
                  </p>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ← Back
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  <AnimatePresence>
                    {events.map((ev, i) => (
                      <EventCard
                        key={i}
                        event={ev}
                        index={i}
                        onUpdate={(idx, updated) =>
                          setEvents(prev => prev.map((e, j) => j === idx ? updated : e))
                        }
                        onRemove={idx =>
                          setEvents(prev => prev.filter((_, j) => j !== idx))
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Edit or remove events before saving
                </p>
              </motion.div>
            )}

            {/* Step 3 — Done */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-8 gap-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
                >
                  <CheckCircle2 size={40} className="text-green-500" />
                </motion.div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">Done! 🎉</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {events.length} events added to your calendar
                  </p>
                </div>
                <button
                  onClick={() => { onImported(); onClose() }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition-colors"
                >
                  <Calendar size={16} /> Open Calendar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step !== 3 && (
          <div className="p-6 pt-0 flex gap-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            {step === 1 && (
              <Button
                onClick={handleParse}
                loading={loading}
                disabled={loading || !text.trim()}
                className="flex-1 gap-2"
              >
                {!loading && <Sparkles size={14} />}
                Parse Schedule
              </Button>
            )}
            {step === 2 && (
              <Button
                onClick={handleImport}
                loading={importing}
                disabled={importing || !events.length}
                className="flex-1 gap-2"
              >
                {!importing && <Calendar size={14} />}
                Add {events.length} events
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
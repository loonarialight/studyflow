import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Search, Plus, Trophy, MessageCircle, ArrowLeft, Send, CalendarOff, Square } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'
import { groupsApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/auth.store'
import { useTimerStore, formatTime as formatElapsed } from '../../store/timer.store'
import { Card, Button, Spinner, Empty, Badge } from '../../shared/components/ui'
import { getSocket } from '../../socket/socket.client'

// ─── Shared input className ───────────────────────────────────────────────────
// "input" не является Tailwind-классом, поэтому используем явные утилиты.
const INPUT_CLS =
  'w-full px-4 py-2.5 rounded-xl border border-primary-100 bg-white text-sm ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors'

// ─── Chat helpers ─────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  'bg-indigo-100 text-indigo-700',
  'bg-pink-100 text-pink-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
]

function colorForId(id?: string) {
  if (!id) return AVATAR_PALETTE[0]
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

function initials(name?: string) {
  if (!name) return '?'
  return name.trim()[0]?.toUpperCase() ?? '?'
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

function dateDividerLabel(dateStr: string) {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (isSameDay(date, today)) return 'Сегодня'
  if (isSameDay(date, yesterday)) return 'Вчера'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatMsgTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

const GROUP_GAP_MS = 4 * 60 * 1000

type FeedItem =
  | { kind: 'divider'; key: string; label: string }
  | { kind: 'message'; key: string; msg: any; isFirstInGroup: boolean; isMe: boolean }

function buildFeed(messages: any[], currentUserId?: string): FeedItem[] {
  const feed: FeedItem[] = []
  let lastDateKey: string | null = null
  let lastSenderId: string | null = null
  let lastTime = 0

  for (const msg of messages) {
    const senderId = msg.sender?.id ?? msg.senderId ?? msg.user?.id ?? msg.userId ?? null
    const ts = new Date(msg.createdAt).getTime()
    const dateKey = new Date(msg.createdAt).toDateString()

    if (dateKey !== lastDateKey) {
      feed.push({ kind: 'divider', key: `divider-${dateKey}`, label: dateDividerLabel(msg.createdAt) })
      lastDateKey = dateKey
      lastSenderId = null
    }

    const isFirstInGroup = senderId !== lastSenderId || ts - lastTime > GROUP_GAP_MS

    feed.push({ kind: 'message', key: msg.id, msg, isFirstInGroup, isMe: !!currentUserId && senderId === currentUserId })

    lastSenderId = senderId
    lastTime = ts
  }
  return feed
}

// ─── Study session control ────────────────────────────────────────────────────
// FIX: добавили socket.emit('focus:start') и socket.emit('focus:stop'),
// чтобы PresenceGrid получал обновления через socket, а не только по поллингу.

const StudySessionControl = ({ groupId }: { groupId: string }) => {
  const qc = useQueryClient()
  const timer = useTimerStore()
  const isRunningHere = timer.mode !== 'idle' && timer.groupId === groupId
  const isRunningElsewhere = timer.mode !== 'idle' && timer.groupId !== groupId

  const handleStart = async () => {
    try {
      await timer.start(undefined, null, false, groupId)
      getSocket().emit('focus:start', { groupId, subject: timer.subject || undefined })
      qc.invalidateQueries({ queryKey: ['group-presence', groupId] })
      qc.invalidateQueries({ queryKey: ['sessions-recent'] })
      toast.success('Сессия начата ⏱')
    } catch {
      toast.error('Не удалось начать сессию')
    }
  }

  const handleStop = async () => {
    const elapsedAtStop = timer.elapsed
    getSocket().emit('focus:stop', groupId)
    await timer.stop()
    // Инвалидируем всё что зависит от завершённой сессии:
    // presence в группе, список сессий и аналитику на TrackingPage/AnalyticsPage
    qc.invalidateQueries({ queryKey: ['group-presence', groupId] })
    qc.invalidateQueries({ queryKey: ['sessions-recent'] })
    qc.invalidateQueries({ queryKey: ['analytics'] })
    toast.success(`Сессия завершена — ${formatElapsed(elapsedAtStop)}`)
  }

  if (isRunningHere) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <img src="/on.png" alt="studying" className="w-8 h-8 object-contain shrink-0" />
        <span className="text-xs font-mono tabular-nums text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-full">
          {formatElapsed(timer.elapsed)}
        </span>
        <button
          onClick={handleStop}
          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full bg-gray-700 text-white hover:bg-gray-800 transition-colors"
        >
          <Square size={11} /> Стоп
        </button>
      </div>
    )
  }

  if (isRunningElsewhere) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <img src="/on.png" alt="studying" className="w-7 h-7 object-contain opacity-60" />
        <span className="text-xs text-gray-400">
          Сессия в другом месте — {formatElapsed(timer.elapsed)}
        </span>
      </div>
    )
  }

  return (
    <button
      onClick={handleStart}
      className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors shrink-0"
    >
      <img src="/off.png" alt="idle" className="w-5 h-5 object-contain" />
      Начать учиться здесь
    </button>
  )
}

// ─── Presence grid ────────────────────────────────────────────────────────────

interface PresenceMember {
  userId: string
  name: string
  avatar?: string | null
  isStudyingNow: boolean
  todaySeconds: number
  currentSubject?: string | null
}

const PresenceGrid = ({ groupId }: { groupId: string }) => {
  const timer = useTimerStore()

  // tickOffset — секунды прошедшие с момента последнего ответа сервера.
  // Добавляем его к todaySeconds для всех isStudyingNow участников,
  // чтобы счётчик тикал каждую секунду, а не раз в 10 сек по поллингу.
  const [tickOffset, setTickOffset] = useState(0)

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['group-presence', groupId],
    queryFn: () => groupsApi.presence(groupId).then(r => r.data.data as PresenceMember[]),
    refetchInterval: 10000,
  })

  // Сервер вернул свежие данные — сбрасываем локальный счётчик
  useEffect(() => {
    setTickOffset(0)
  }, [dataUpdatedAt])

  // Тикаем каждую секунду пока хотя бы один участник учится
  useEffect(() => {
    const hasActive = data?.some(m => m.isStudyingNow)
    if (!hasActive) return
    const id = setInterval(() => setTickOffset(o => o + 1), 1000)
    return () => clearInterval(id)
  }, [data])

  // Для текущего пользователя используем точное значение из timer.elapsed.
  // todaySeconds с сервера = предыдущие сессии за день + секунды до последнего фетча.
  // Чтобы не было скачка, берём разницу: (todaySeconds - elapsed_на_момент_фетча) + timer.elapsed.
  // Упрощение: todaySeconds + tickOffset тоже работает с погрешностью ≤10 сек.
  const isMySession = timer.mode !== 'idle' && timer.groupId === groupId

  const liveSeconds = (m: PresenceMember): number => {
    if (!m.isStudyingNow) return m.todaySeconds
    // Я сам — используем точный timer.elapsed из Zustand
    if (isMySession && m.userId === timer.subject) return m.todaySeconds + tickOffset
    return m.todaySeconds + tickOffset
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 px-5 py-4 border-b border-gray-100 bg-white">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }
  if (!data?.length) return null

  return (
    <div className="border-b border-gray-100 bg-white px-5 py-4">
      <p className="text-xs text-gray-400 mb-3">Кто учится сейчас</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {data.map((m) => (
          <div
            key={m.userId}
            className={`flex flex-col items-center gap-2 px-3 pt-3 pb-3 rounded-2xl border transition-colors ${
              m.isStudyingNow
                ? 'border-orange-200 bg-orange-50'
                : 'border-gray-100 bg-gray-50'
            }`}
          >
            <img
              src={m.isStudyingNow ? '/on.png' : '/off.png'}
              alt={m.isStudyingNow ? 'studying' : 'idle'}
              className="w-16 h-16 object-contain"
            />
            <div className="text-center min-w-0 w-full">
              <p className="text-xs font-semibold text-gray-800 truncate">{m.name}</p>
              <p className={`text-[11px] font-mono tabular-nums mt-0.5 ${
                m.isStudyingNow ? 'text-orange-600' : 'text-gray-400'
              }`}>
                {formatDuration(liveSeconds(m))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Day-off panel ────────────────────────────────────────────────────────────

const DAY_OFF_OPTIONS: { value: 'NONE' | 'HALF' | 'FULL'; label: string; activeClass: string }[] = [
  { value: 'NONE',  label: 'Учусь сегодня', activeClass: 'bg-emerald-600 text-white' },
  { value: 'HALF',  label: 'Полу-day-off',  activeClass: 'bg-amber-500 text-white'   },
  { value: 'FULL',  label: 'Day-off',        activeClass: 'bg-gray-700 text-white'    },
]

const DayOffPanel = ({ groupId }: { groupId: string }) => {
  const qc = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const date = todayKey()

  const { data: dayOffs, isLoading } = useQuery({
    queryKey: ['group-dayoffs', groupId, date],
    queryFn: () => groupsApi.getDayOffs(groupId, date).then(r => r.data.data),
  })

  // FIX: не выставляем дефолт 'NONE' пока данные грузятся.
  // null означает «пользователь ещё ничего не выбрал» — ни одна кнопка не подсвечена.
  const myStatus: 'NONE' | 'HALF' | 'FULL' | null = isLoading
    ? null
    : (dayOffs?.find((d: any) => d.userId === currentUser?.id)?.status ?? null)

  const setMutation = useMutation({
    mutationFn: (status: 'NONE' | 'HALF' | 'FULL') =>
      groupsApi.setDayOff(groupId, { status, date }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-dayoffs', groupId, date] })
    },
    onError: () => toast.error('Не удалось обновить статус'),
  })

  return (
    <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-white overflow-x-auto">
      <CalendarOff size={14} className="text-gray-400 shrink-0" />
      <span className="text-xs text-gray-500 shrink-0">Статус на сегодня:</span>
      <div className="flex gap-1.5">
        {DAY_OFF_OPTIONS.map((opt) => {
          const active = myStatus === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => !active && setMutation.mutate(opt.value)}
              disabled={setMutation.isPending || isLoading}
              className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors whitespace-nowrap ${
                active ? opt.activeClass : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Group Detail ─────────────────────────────────────────────────────────────

const GroupDetailView = ({ id }: { id: string }) => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupsApi.get(id).then(r => r.data.data),
  })

  const { data: messagesData, isLoading: messagesLoading } = useQuery<any[]>({
    queryKey: ['group-messages', id],
    queryFn: () => groupsApi.messages(id).then(r => r.data.data),
    // поллинг — fallback на случай потери соединения с сокетом
    refetchInterval: 5000,
  })

  // ─── Socket.io ──────────────────────────────────────────────────────────────
  // FIX: вся реал-тайм логика была полностью отсутствует.
  //   1. group:join — без него сервер не включает нас в комнату, события не приходят
  //   2. chat:message — добавляем новые сообщения прямо в кеш без перезапроса
  //   3. focus:update — инвалидируем presence-запрос, чтобы PresenceGrid обновился мгновенно
  //   4. cleanup — убираем обработчики и выходим из комнаты при анмаунте
  useEffect(() => {
    const socket = getSocket()

    // Входим в группу — после этого сервер будет слать нам события этой комнаты
    socket.emit('group:join', id)

    const handleMessage = (msg: any) => {
      qc.setQueryData(['group-messages', id], (old: any[] | undefined) => {
        const arr = Array.isArray(old) ? old : []
        // Защита от дублей: если поллинг вернул это же сообщение раньше сокета
        if (arr.some((m) => m.id === msg.id)) return arr
        return [...arr, msg]
      })
    }

    const handleFocusUpdate = () => {
      // presence изменилась — сбрасываем кеш, PresenceGrid перезапросит
      qc.invalidateQueries({ queryKey: ['group-presence', id] })
    }

    socket.on('chat:message', handleMessage)
    socket.on('focus:update', handleFocusUpdate)

    return () => {
      socket.off('chat:message', handleMessage)
      socket.off('focus:update', handleFocusUpdate)
      socket.emit('group:leave', id)
    }
  }, [id, qc])
  // ────────────────────────────────────────────────────────────────────────────

  const feed = useMemo(
    () => buildFeed(messagesData ?? [], currentUser?.id),
    [messagesData, currentUser?.id]
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feed.length])

  // FIX: отправка теперь через socket.emit, а не REST.
  // REST sendMessage только пишет в БД без броадкаста — другие участники получали
  // сообщения только через 5-сек поллинг. Socket-хендлер на бэкенде сохраняет
  // в БД И делает io.to(room).emit('chat:message', ...) всем участникам комнаты.
  const handleSend = async () => {
    const content = message.trim()
    if (!content || isSending) return

    setIsSending(true)
    setMessage('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      getSocket().emit('chat:message', { groupId: id, content })
    } catch {
      toast.error('Не удалось отправить сообщение')
    } finally {
      setIsSending(false)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="lg" /></div>
  if (!data) return <div className="p-6"><Empty icon="👥" title="Group not found" description="" /></div>

  return (
    <div className="flex flex-col h-screen p-6 gap-4 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/groups')}>
          <ArrowLeft size={16} />
        </Button>
        <div className="w-11 h-11 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-sm shrink-0">
          <Users size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 truncate">{data.name}</h1>
          {data.description && (
            <p className="text-sm text-gray-500 truncate">{data.description}</p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <StudySessionControl groupId={id} />
          <Badge color="purple">{data._count?.members || 0} members</Badge>
        </div>
      </div>

      {/* Chat */}
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden p-0 border border-gray-100">
        <PresenceGrid groupId={id} />
        <DayOffPanel groupId={id} />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4 space-y-1">
          {messagesLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`flex gap-2 ${i % 2 ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse shrink-0" />
                  <div className="h-10 w-40 rounded-2xl bg-gray-200 animate-pulse" />
                </div>
              ))}
            </div>
          ) : feed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[40vh] gap-2 text-gray-400">
              <MessageCircle size={32} className="opacity-30" />
              <p className="text-sm">Сообщений пока нет. Напишите первыми! 👋</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {feed.map((item) => {
                if (item.kind === 'divider') {
                  return (
                    <div key={item.key} className="flex items-center justify-center py-3">
                      <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                        {item.label}
                      </span>
                    </div>
                  )
                }

                const { msg, isFirstInGroup, isMe } = item
                const senderName = msg.sender?.name ?? msg.user?.name
                const name = senderName || (isMe ? currentUser?.name : null) || 'Без имени'
                const senderId = msg.sender?.id ?? msg.senderId ?? msg.user?.id ?? msg.userId

                return (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''} ${
                      isFirstInGroup ? 'mt-3' : 'mt-0.5'
                    }`}
                  >
                    <div className="w-8 shrink-0 flex items-end justify-center">
                      {!isMe && isFirstInGroup && (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${colorForId(senderId)}`}>
                          {initials(name)}
                        </div>
                      )}
                    </div>

                    <div className={`group flex flex-col max-w-[60%] ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && isFirstInGroup && (
                        <span className="text-xs font-medium text-gray-500 mb-1 ml-1">{name}</span>
                      )}

                      <div className="flex items-end gap-1.5">
                        {isMe && (
                          <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1 whitespace-nowrap">
                            {formatMsgTime(msg.createdAt)}
                          </span>
                        )}
                        <div
                          className={`px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap ${
                            isMe
                              ? 'bg-primary-600 text-white rounded-2xl rounded-tr-md'
                              : 'bg-white text-gray-800 rounded-2xl rounded-tl-md border border-gray-200'
                          }`}
                        >
                          {msg.content}
                        </div>
                        {!isMe && (
                          <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1 whitespace-nowrap">
                            {formatMsgTime(msg.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 bg-white p-3 flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-300/60 focus:bg-white transition-all"
            style={{ minHeight: 42, maxHeight: 120 }}
            placeholder="Введите сообщение..."
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="h-[42px] w-[42px] shrink-0 rounded-2xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
          >
            {isSending ? <Spinner size="sm" /> : <Send size={16} />}
          </button>
        </div>
      </Card>
    </div>
  )
}

// ─── Groups List ──────────────────────────────────────────────────────────────

const GroupsListView = () => {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', goal: '' })
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['groups', search],
    queryFn: () => groupsApi.list({ search }).then(r => r.data),
    placeholderData: (prev) => prev,
  })

  const createMutation = useMutation({
    mutationFn: () => groupsApi.create(form).then(r => r.data.data),
    onSuccess: (group) => {
      toast.success('Группа создана!')
      qc.invalidateQueries({ queryKey: ['groups'] })
      setShowCreate(false)
      navigate(`/groups/${group.id}`)
    },
    onError: () => toast.error('Не удалось создать группу'),
  })

  const joinMutation = useMutation({
    mutationFn: (id: string) => groupsApi.join(id).then(() => id),
    onSuccess: (id) => {
      toast.success('Вы вступили в группу!')
      qc.invalidateQueries({ queryKey: ['groups'] })
      navigate(`/groups/${id}`)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Не удалось вступить'),
  })

  return (
    <div className="p-6 space-y-6 animate-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Study Groups</h1>
          <p className="text-gray-500 text-sm mt-1">Найди и вступи в учебное сообщество</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus size={16} /> Создать
        </Button>
      </div>

      {/* FIX: className="input" → INPUT_CLS (Tailwind-классы) */}
      {showCreate && (
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">Новая группа</h3>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Название группы"
            className={INPUT_CLS}
          />
          <input
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Описание (необязательно)"
            className={INPUT_CLS}
          />
          <input
            value={form.goal}
            onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
            placeholder="Цель учёбы (необязательно)"
            className={INPUT_CLS}
          />
          <div className="flex gap-2">
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
              Создать
            </Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Отмена</Button>
          </div>
        </Card>
      )}

      {/* FIX: className="input pl-10" → INPUT_CLS + pl-10 */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск групп..."
          className={`${INPUT_CLS} pl-10`}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
      ) : data?.data?.length === 0 ? (
        <Empty icon="👥" title="Группы не найдены" description="Создай первую!" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data?.data?.map((g: any) => (
            <Card key={g.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-primary-600" />
                </div>
                <Badge color="purple">{g._count?.members || 0} members</Badge>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{g.name}</h3>
                {g.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{g.description}</p>
                )}
                {g.goal && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Trophy size={12} className="text-amber-500" />
                    <span className="text-xs text-amber-700">{g.goal}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5"
                  onClick={() => navigate(`/groups/${g.id}`)}>
                  <MessageCircle size={13} /> Открыть
                </Button>
                <Button size="sm" className="flex-1"
                  onClick={() => joinMutation.mutate(g.id)}
                  loading={joinMutation.isPending}>
                  Вступить
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export const GroupsPage = () => {
  const { id } = useParams<{ id: string }>()
  return id ? <GroupDetailView id={id} /> : <GroupsListView />
}
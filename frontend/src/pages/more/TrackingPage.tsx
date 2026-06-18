import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Play, Square, Pause, RotateCcw, Timer, ChevronDown, BookOpen, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { trackingApi } from '../../api/endpoints'
import { useTimerStore, formatTime } from '../../store/timer.store'
import { Card, Button, Badge, Empty } from '../../shared/components/ui'

// ─── Типы ─────────────────────────────────────────────────────────────────────

interface Session {
  id: string
  subject?: string
  duration: number
  startedAt: string
  endedAt?: string
  isPomodoro: boolean
  type: 'REGULAR' | 'POMODORO' | 'GROUP' | 'FOCUS'
  category?: { id: string; name: string; color?: string; icon?: string } | null
}

interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

// ─── Хелперы ──────────────────────────────────────────────────────────────────

/**
 * Форматирует дату сессии в читаемый вид.
 * Показывает «Сегодня», «Вчера» или «ДД месяца» + время.
 */
function formatSessionDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)

  const time = date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })

  if (date >= todayStart) return `Сегодня, ${time}`
  if (date >= yesterdayStart) return `Вчера, ${time}`
  return date.toLocaleDateString('ru', { day: 'numeric', month: 'short' }) + `, ${time}`
}

/**
 * Форматирует длительность сессии.
 * < 60 сек → «меньше минуты»
 * < 60 мин → «Xм»
 * иначе → «Xч Yм»
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return '< 1м'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}м`
  return m === 0 ? `${h}ч` : `${h}ч ${m}м`
}

/**
 * Возвращает заголовок дневной группы:
 * сегодня → «Сегодня», вчера → «Вчера», иначе «ДД месяца ГГГГ»
 */
function dayGroupLabel(dateStr: string): string {
  const now = new Date()
  const todayStr = now.toDateString()
  const yesterdayStr = new Date(now.getTime() - 86400000).toDateString()
  if (dateStr === todayStr) return 'Сегодня'
  if (dateStr === yesterdayStr) return 'Вчера'
  return new Date(dateStr).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Суммирует длительности сессий в секундах → строка */
function sumDuration(sessions: Session[]): string {
  const total = sessions.reduce((acc, s) => acc + (s.duration || 0), 0)
  return formatDuration(total)
}

/** Бейдж типа сессии */
function SessionTypeBadge({ session }: { session: Session }) {
  if (session.isPomodoro || session.type === 'POMODORO') {
    return <Badge color="amber">🍅 Помодоро</Badge>
  }
  if (session.type === 'GROUP') {
    return <Badge color="teal">👥 Группа</Badge>
  }
  return <Badge color="purple">⏱ Фокус</Badge>
}

// ─── Компонент категории ───────────────────────────────────────────────────────

function CategoryPill({ category }: { category: Category }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: category.color ? `${category.color}20` : '#EEEDFE',
        color: category.color ?? '#534AB7',
      }}
    >
      {category.icon && <span>{category.icon}</span>}
      {category.name}
    </span>
  )
}

// ─── Основная страница ────────────────────────────────────────────────────────

export const TrackingPage = () => {
  const [subject, setSubject] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [isPomodoro, setIsPomodoro] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const timer = useTimerStore()

  // Запоминаем elapsed ДО вызова stop, чтобы тост показал правильное время
  const elapsedBeforeStop = useRef(0)

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => trackingApi.getCategories().then(r => r.data.data),
  })

  const { data: sessionsData, refetch: refetchSessions } = useQuery<{
    data: Session[]
    total: number
  }>({
    queryKey: ['sessions-recent', showAll],
    queryFn: () =>
      trackingApi
        .getSessions({ limit: showAll ? 50 : 10 })
        .then(r => r.data),
    refetchInterval: timer.mode === 'idle' ? false : 30000,
  })

  const sessions: Session[] = sessionsData?.data ?? []

  // Группируем сессии по дням (ключ — результат date.toDateString())
  const grouped = sessions.reduce<Record<string, Session[]>>((acc, s) => {
    const key = new Date(s.startedAt).toDateString()
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})
  const groupKeys = Object.keys(grouped) // уже в порядке desc, т.к. API сортирует desc

  // ─── Хэндлеры ───────────────────────────────────────────────────────────────

  const handleStart = async () => {
    try {
      await timer.start(subject, selectedCategoryId, isPomodoro)
      toast.success(isPomodoro ? '🍅 Помодоро начат!' : '⏱ Сессия началась!')
    } catch {
      toast.error('Не удалось запустить сессию')
    }
  }

  const handleStop = async () => {
    // ⚠ Фиксируем elapsed ДО вызова stop (stop сбрасывает его в 0)
    elapsedBeforeStop.current = timer.elapsed
    await timer.stop()
    await refetchSessions()
    toast.success(`✅ Сессия сохранена — ${formatDuration(elapsedBeforeStop.current)}`)
    setSubject('')
    setSelectedCategoryId(null)
  }

  const isRunning = timer.mode !== 'idle' && timer.mode !== 'paused'

  // Pomodoro: прогресс внутри текущего рабочего периода
  const pomodoroMax = timer.pomodoroWorkMin * 60
  const pomodoroProgress = isPomodoro
    ? Math.min((timer.elapsed % pomodoroMax) / pomodoroMax, 1) * 100
    : 0

  // ─── UI ─────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 animate-in max-w-2xl mx-auto">

      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Focus Tracker</h1>
        <p className="text-gray-500 text-sm mt-1">Отслеживай учёбу и анализируй прогресс</p>
      </div>

      {/* ── Карточка таймера ────────────────────────────────────────────────── */}
      <Card className="p-8 flex flex-col items-center gap-6">

        {/* Кольцо таймера */}
        <div className="relative w-44 h-44">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Фоновое кольцо */}
            <circle cx="50" cy="50" r="44" fill="none" stroke="#EEEDFE" strokeWidth="6" />
            {/* Прогресс: только для помодоро */}
            {isPomodoro && (
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke="#7F77DD" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - pomodoroProgress / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            )}
            {/* Для обычной сессии — пульсирующий акцент */}
            {!isPomodoro && isRunning && (
              <circle cx="50" cy="50" r="44" fill="none" stroke="#7F77DD" strokeWidth="6" opacity="0.3" />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="text-4xl font-bold text-gray-900 font-mono tabular-nums">
              {formatTime(timer.elapsed)}
            </span>
            {timer.mode !== 'idle' && (
              <span className={clsx(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                timer.mode === 'paused'
                  ? 'bg-gray-100 text-gray-600'
                  : isPomodoro
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-primary-50 text-primary-700'
              )}>
                {timer.mode === 'paused' ? '⏸ Пауза' : isPomodoro ? '🍅 Помодоро' : '▶ Идёт'}
              </span>
            )}
          </div>
        </div>

        {/* Форма запуска (только в idle) */}
        {timer.mode === 'idle' && (
          <div className="w-full space-y-3">

            {/* Предмет */}
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              placeholder="Что изучаешь? (необязательно)"
              className="w-full px-4 py-2.5 rounded-xl border border-primary-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 placeholder:text-gray-400"
            />

            {/* Категория */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  className={clsx(
                    'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors font-medium',
                    selectedCategoryId === null
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'border-primary-100 text-gray-500 hover:bg-primary-50'
                  )}
                >
                  <Layers size={11} /> Без категории
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={clsx(
                      'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors font-medium',
                      selectedCategoryId === cat.id
                        ? 'text-white border-transparent'
                        : 'border-primary-100 text-gray-600 hover:bg-primary-50'
                    )}
                    style={selectedCategoryId === cat.id ? {
                      backgroundColor: cat.color ?? '#534AB7',
                      borderColor: cat.color ?? '#534AB7',
                    } : {}}
                  >
                    {cat.icon && <span>{cat.icon}</span>}
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Переключатель помодоро */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPomodoro(p => !p)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border',
                  isPomodoro
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                🍅 Помодоро {isPomodoro ? 'ВКЛ' : 'ВЫКЛ'}
              </button>
              {isPomodoro && (
                <span className="text-xs text-gray-400">
                  {timer.pomodoroWorkMin}м работа / {timer.pomodoroBreakMin}м перерыв
                </span>
              )}
            </div>
          </div>
        )}

        {/* Показываем текущую категорию/предмет при активной сессии */}
        {timer.mode !== 'idle' && (timer.subject || timer.categoryId) && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <BookOpen size={14} />
            <span>{timer.subject || 'Без названия'}</span>
            {timer.categoryId && (() => {
              const cat = categories.find(c => c.id === timer.categoryId)
              return cat ? <CategoryPill category={cat} /> : null
            })()}
          </div>
        )}

        {/* Кнопки управления */}
        <div className="flex gap-3">
          {timer.mode === 'idle' ? (
            <Button size="lg" onClick={handleStart} className="gap-2 px-8">
              <Play size={18} /> Начать
            </Button>
          ) : (
            <>
              {timer.mode === 'paused' ? (
                <Button size="lg" onClick={timer.resume} className="gap-2">
                  <Play size={18} /> Продолжить
                </Button>
              ) : (
                <Button size="lg" variant="outline" onClick={timer.pause} className="gap-2">
                  <Pause size={18} /> Пауза
                </Button>
              )}
              <Button size="lg" variant="danger" onClick={handleStop} className="gap-2">
                <Square size={18} /> Стоп
              </Button>
              <Button size="lg" variant="ghost" onClick={timer.reset} className="p-2.5" title="Сбросить">
                <RotateCcw size={18} />
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* ── История сессий ──────────────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Timer size={16} className="text-primary-600" />
            <h2 className="font-semibold text-gray-900">История сессий</h2>
            {sessions.length > 0 && (
              <span className="text-xs text-gray-400 font-normal">
                ({sessions.length})
              </span>
            )}
          </div>
        </div>

        {sessions.length === 0 ? (
          <Empty
            icon="⏱"
            title="Нет сессий"
            description="Запусти таймер — здесь появится история учёбы"
          />
        ) : (
          <div className="space-y-5">
            {groupKeys.map((dayKey) => {
              const daySessions = grouped[dayKey]
              return (
                <div key={dayKey}>
                  {/* Заголовок дня */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {dayGroupLabel(dayKey)}
                    </span>
                    <span className="text-xs text-primary-600 font-medium">
                      итого {sumDuration(daySessions)}
                    </span>
                  </div>

                  {/* Сессии дня */}
                  <div className="space-y-1.5">
                    {daySessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary-50/50 hover:bg-primary-50 transition-colors"
                      >
                        {/* Левая часть: предмет + категория + дата */}
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">
                              {s.subject || 'Учёба'}
                            </span>
                            {s.category && <CategoryPill category={s.category} />}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-400">
                              {formatSessionDate(s.startedAt)}
                            </span>
                            <SessionTypeBadge session={s} />
                          </div>
                        </div>

                        {/* Правая часть: длительность */}
                        <span className="text-sm font-semibold text-primary-700 tabular-nums ml-3 shrink-0">
                          {formatDuration(s.duration)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Кнопка «Показать все» */}
        {!showAll && (sessionsData?.total ?? 0) > 10 && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 font-medium py-2 rounded-xl hover:bg-primary-50 transition-colors"
          >
            <ChevronDown size={16} />
            Показать все ({sessionsData?.total})
          </button>
        )}
      </Card>
    </div>
  )
}
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Play, Square, Pause, RotateCcw, Timer } from 'lucide-react'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { trackingApi } from '../../api/endpoints'
import { useTimerStore, formatTime } from '../../store/timer.store'
import { Card, Button, Badge } from '../../shared/components/ui'

export const TrackingPage = () => {
  const [subject, setSubject] = useState('')
  const [isPomodoro, setIsPomodoro] = useState(false)
  const timer = useTimerStore()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => trackingApi.getCategories().then(r => r.data.data),
  })

  const { data: sessionsData } = useQuery({
    queryKey: ['sessions-recent'],
    queryFn: () => trackingApi.getSessions({ limit: 5 }).then(r => r.data),
    refetchInterval: timer.mode === 'idle' ? false : 30000,
  })

  const handleStart = async () => {
    try {
      await timer.start(subject, null, isPomodoro)
      toast.success(isPomodoro ? '🍅 Pomodoro started!' : '⏱ Session started!')
    } catch {
      toast.error('Failed to start session')
    }
  }

  const handleStop = async () => {
    await timer.stop()
    toast.success(`✅ Session saved — ${formatTime(timer.elapsed)}`)
  }

  const isRunning = timer.mode !== 'idle' && timer.mode !== 'paused'

  // Pomodoro: progress as % of work period
  const pomodoroMax = timer.pomodoroWorkMin * 60
  const progress = isPomodoro
    ? Math.min((timer.elapsed % pomodoroMax) / pomodoroMax, 1) * 100
    : 0

  return (
    <div className="p-6 space-y-6 animate-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Focus Tracker</h1>
        <p className="text-gray-500 text-sm mt-1">Track your study sessions</p>
      </div>

      {/* Timer Card */}
      <Card className="p-8 flex flex-col items-center gap-6">
        {/* Circle timer */}
        <div className="relative w-44 h-44">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#ede9fe" strokeWidth="6" />
            {isPomodoro && (
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke="#7F77DD" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-gray-900 font-mono tabular-nums">
              {formatTime(timer.elapsed)}
            </span>
            {timer.mode !== 'idle' && (
              <Badge color={isRunning ? 'purple' : 'gray'} className="mt-1">
                {timer.mode === 'paused' ? 'Paused' : isPomodoro ? '🍅 Focus' : '▶ Running'}
              </Badge>
            )}
          </div>
        </div>

        {/* Subject input */}
        {timer.mode === 'idle' && (
          <div className="w-full space-y-3">
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="What are you studying? (optional)"
              className="w-full px-4 py-2.5 rounded-xl border border-primary-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPomodoro(p => !p)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border',
                  isPomodoro
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                🍅 Pomodoro {isPomodoro ? 'ON' : 'OFF'}
              </button>
              {isPomodoro && (
                <span className="text-xs text-gray-400">
                  {timer.pomodoroWorkMin}m work / {timer.pomodoroBreakMin}m break
                </span>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {timer.mode === 'idle' ? (
            <Button size="lg" onClick={handleStart} className="gap-2 px-8">
              <Play size={18} /> Start
            </Button>
          ) : (
            <>
              {timer.mode === 'paused' ? (
                <Button size="lg" onClick={timer.resume} className="gap-2">
                  <Play size={18} /> Resume
                </Button>
              ) : (
                <Button size="lg" variant="outline" onClick={timer.pause} className="gap-2">
                  <Pause size={18} /> Pause
                </Button>
              )}
              <Button size="lg" variant="danger" onClick={handleStop} className="gap-2">
                <Square size={18} /> Stop
              </Button>
              <Button size="lg" variant="ghost" onClick={timer.reset} className="p-2.5">
                <RotateCcw size={18} />
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Recent sessions */}
      {sessionsData?.data?.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Timer size={16} className="text-primary-600" />
            <h2 className="font-semibold text-gray-900">Recent sessions</h2>
          </div>
          <div className="space-y-2">
            {sessionsData.data.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-primary-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.subject || 'Study session'}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(s.startedAt).toLocaleDateString('en', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Badge color="purple">{formatTime(s.duration)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Search, Plus, Trophy, MessageCircle, ArrowLeft, Send } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'
import { groupsApi } from '../../api/endpoints'
import { useAuthStore } from '../../store/auth.store'
import { Card, Button, Spinner, Empty, Badge } from '../../shared/components/ui'

// ─── Chat helpers ───────────────────────────────────────────────────────────

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

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

const GROUP_GAP_MS = 4 * 60 * 1000 // сообщения одного автора реже чем раз в 4 мин — отдельные группы

type FeedItem =
  | { kind: 'divider'; key: string; label: string }
  | { kind: 'message'; key: string; msg: any; isFirstInGroup: boolean; isMe: boolean }

function buildFeed(messages: any[], currentUserId?: string): FeedItem[] {
  const feed: FeedItem[] = []
  let lastDateKey: string | null = null
  let lastSenderId: string | null = null
  let lastTime = 0

  for (const msg of messages) {
    const senderId = msg.sender?.id ?? msg.senderId ?? null
    const ts = new Date(msg.createdAt).getTime()
    const dateKey = new Date(msg.createdAt).toDateString()

    if (dateKey !== lastDateKey) {
      feed.push({ kind: 'divider', key: `divider-${dateKey}`, label: dateDividerLabel(msg.createdAt) })
      lastDateKey = dateKey
      lastSenderId = null
    }

    const isFirstInGroup =
      senderId !== lastSenderId || ts - lastTime > GROUP_GAP_MS

    feed.push({
      kind: 'message',
      key: msg.id,
      msg,
      isFirstInGroup,
      isMe: !!currentUserId && senderId === currentUserId,
    })

    lastSenderId = senderId
    lastTime = ts
  }

  return feed
}

// ─── Group Detail ─────────────────────────────────────────────────────────────

const GroupDetailView = ({ id }: { id: string }) => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const [message, setMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupsApi.get(id).then(r => r.data.data),
  })

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['group-messages', id],
    queryFn: () => groupsApi.messages(id).then(r => r.data.data),
    refetchInterval: 5000,
  })

  const feed = useMemo(
    () => buildFeed(messagesData ?? [], currentUser?.id),
    [messagesData, currentUser?.id]
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feed.length])

  const sendMutation = useMutation({
    mutationFn: () => groupsApi.sendMessage(id, { content: message.trim() }),
    onSuccess: () => {
      setMessage('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      qc.invalidateQueries({ queryKey: ['group-messages', id] })
    },
    onError: () => toast.error('Не удалось отправить сообщение'),
  })

  const handleSend = () => {
    if (!message.trim() || sendMutation.isPending) return
    sendMutation.mutate()
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  if (isLoading) return (
    <div className="flex justify-center py-10"><Spinner size="lg" /></div>
  )

  if (!data) return (
    <div className="p-6">
      <Empty icon="👥" title="Group not found" description="" />
    </div>
  )

  return (
    <div className="p-6 space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/groups')}>
          <ArrowLeft size={16} />
        </Button>
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-sm shrink-0">
          <Users size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 truncate">{data.name}</h1>
          {data.description && (
            <p className="text-sm text-gray-500 truncate">{data.description}</p>
          )}
        </div>
        <div className="ml-auto shrink-0">
          <Badge color="purple">{data._count?.members || 0} members</Badge>
        </div>
      </div>

      {/* Chat */}
      <Card className="flex flex-col h-[68vh] overflow-hidden p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50/60">
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
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
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
                const name = msg.sender?.name || (isMe ? currentUser?.name : null) || 'Без имени'

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
                    {/* Avatar column — fixed width so bubbles align even when avatar is hidden */}
                    <div className="w-8 shrink-0 flex items-end justify-center">
                      {!isMe && isFirstInGroup && (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${colorForId(
                            msg.sender?.id ?? msg.senderId
                          )}`}
                        >
                          {initials(name)}
                        </div>
                      )}
                    </div>

                    <div className={`group flex flex-col max-w-[68%] ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && isFirstInGroup && (
                        <span className="text-xs font-medium text-gray-500 mb-1 ml-1">
                          {name}
                        </span>
                      )}

                      <div className="flex items-end gap-1.5">
                        {isMe && (
                          <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1 whitespace-nowrap">
                            {formatTime(msg.createdAt)}
                          </span>
                        )}

                        <div
                          className={`px-3.5 py-2 text-sm leading-relaxed break-words shadow-sm ${
                            isMe
                              ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-2xl rounded-tr-md'
                              : 'bg-white text-gray-800 rounded-2xl rounded-tl-md border border-gray-100'
                          }`}
                        >
                          {msg.content}
                        </div>

                        {!isMe && (
                          <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1 whitespace-nowrap">
                            {formatTime(msg.createdAt)}
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
            disabled={!message.trim() || sendMutation.isPending}
            className="h-[42px] w-[42px] shrink-0 rounded-2xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
          >
            {sendMutation.isPending ? <Spinner size="sm" /> : <Send size={16} />}
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
      toast.success('Group created!')
      qc.invalidateQueries({ queryKey: ['groups'] })
      setShowCreate(false)
      navigate(`/groups/${group.id}`)
    },
    onError: () => toast.error('Failed to create group'),
  })

  const joinMutation = useMutation({
    mutationFn: (id: string) => groupsApi.join(id).then(() => id),
    onSuccess: (id) => {
      toast.success('Joined group!')
      qc.invalidateQueries({ queryKey: ['groups'] })
      navigate(`/groups/${id}`)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to join'),
  })

  return (
    <div className="p-6 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Study Groups</h1>
          <p className="text-gray-500 text-sm mt-1">Find and join study communities</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus size={16} /> Create
        </Button>
      </div>

      {showCreate && (
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">Create new group</h3>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Group name" className="input" />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)" className="input" />
          <input value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
            placeholder="Study goal (optional)" className="input" />
          <div className="flex gap-2">
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
              Create
            </Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search groups..."
          className="input pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
      ) : data?.data?.length === 0 ? (
        <Empty icon="👥" title="No groups found" description="Be the first to create one!" />
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
                  <MessageCircle size={13} /> View
                </Button>
                <Button size="sm" className="flex-1"
                  onClick={() => joinMutation.mutate(g.id)}
                  loading={joinMutation.isPending}>
                  Join
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
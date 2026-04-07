import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Send, Plus, Bot, User, Loader2, Sparkles,
  X, BookOpen, Zap, Calendar, Tag, ChevronRight,
  Trash2, MessageSquare, CalendarPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { aiApi } from '@/api/endpoints'
import { Button, Spinner } from '@/shared/components/ui'

interface Message {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string
}

interface Chat {
  id: string
  title: string
  updatedAt: string
  messages: Message[]
}

const SUGGESTIONS = [
  { icon: Calendar,   text: 'Составь расписание на завтра' },
  { icon: Sparkles,   text: 'Добавь пару по математике на завтра в 10:00' },
  { icon: BookOpen,   text: 'Как эффективнее учиться?' },
  { icon: Zap,        text: 'Мотивируй меня учиться' },
]

// ── Markdown renderer ─────────────────────────────────────────────────────────

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/^\d+\.\s(.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/^[-•]\s(.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="space-y-1 my-2">$&</ul>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br/>')
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'USER'
  const html   = isUser ? msg.content : renderMarkdown(msg.content)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={clsx('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser ? 'bg-primary-600' : 'bg-white border-2 border-primary-100'
      )}>
        {isUser
          ? <User size={14} className="text-white" />
          : <Bot size={14} className="text-primary-600" />}
      </div>
      <div className={clsx(
        'max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
        isUser
          ? 'bg-primary-600 text-white rounded-tr-sm'
          : 'bg-white text-gray-800 border border-primary-100/60 rounded-tl-sm shadow-sm'
      )}>
        {isUser
          ? <p className="whitespace-pre-wrap">{msg.content}</p>
          : <div className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }} />
        }
      </div>
    </motion.div>
  )
}

// ── Tutorial ──────────────────────────────────────────────────────────────────

function TutorialModal({ onClose }: { onClose: () => void }) {
  const steps = [
    { icon: MessageSquare, color: '#7C6FE0', title: 'Ask anything',
      desc: 'Ask about studying, planning, motivation. AI understands Russian and English.' },
    { icon: CalendarPlus, color: '#3B82F6', title: 'Add events to calendar',
      desc: 'Say "add math class at 3pm tomorrow" — AI will create the event automatically.' },
    { icon: Zap, color: '#F59E0B', title: 'Productivity tips',
      desc: 'Pomodoro, memorization methods, fighting procrastination — all here.' },
    { icon: BookOpen, color: '#10B981', title: 'Powered by Groq + Llama 3.3',
      desc: 'Groq uses specialized LPU chips. Responses in 1-2 seconds. Free tier: 14,400 req/day.' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">How AI Chat works</h2>
              <p className="text-xs text-gray-400">Groq · Llama 3.3 · fast & free</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {steps.map((step, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: step.color + '15' }}>
                <step.icon size={16} style={{ color: step.color }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-start gap-2 p-3 rounded-2xl bg-blue-50 border border-blue-100 mb-4">
          <CalendarPlus size={14} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            <strong>Try it:</strong> "Add math class tomorrow at 3pm" or "Schedule study session on Friday at 10am"
          </p>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-2xl bg-violet-50 border border-violet-100 mb-4">
          <Zap size={14} className="text-violet-500 shrink-0" />
          <p className="text-xs text-violet-700">
            <strong>Groq</strong> LPU chips — up to 750 tokens/sec. 14,400 free requests/day.
          </p>
        </div>

        <button onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
          Start chatting <ChevronRight size={16} />
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export const AiChatPage = () => {
  const qc = useQueryClient()
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [input, setInput]               = useState('')
  const [showTutorial, setShowTutorial] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: chats = [], isLoading: loadingChats } = useQuery<Chat[]>({
    queryKey: ['ai-chats'],
    queryFn: () => aiApi.getChats().then(r => r.data.data),
  })

  const { data: messages = [], isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ['ai-messages', activeChatId],
    queryFn: () => aiApi.getMessages(activeChatId as string).then(r => r.data.data),
    enabled: !!activeChatId,
  })

  const createChat = useMutation({
    mutationFn: (title: string) => aiApi.createChat(title).then(r => r.data.data),
    onSuccess: (chat: Chat) => {
      qc.invalidateQueries({ queryKey: ['ai-chats'] })
      setActiveChatId(chat.id)
    },
  })

  const sendMessage = useMutation({
    mutationFn: ({ chatId, message }: { chatId: string; message: string }) =>
      aiApi.sendMessage(chatId, message).then(r => r.data),

    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['ai-messages', activeChatId] })
      qc.invalidateQueries({ queryKey: ['ai-chats'] })

      // Support both { data: { calendarEventsCreated } } and flat { calendarEventsCreated }
      const payload   = data?.data ?? data
      const count     = payload?.calendarEventsCreated ?? 0
      const deleted   = payload?.calendarEventsDeleted ?? 0
      const conflicts = payload?.conflicts as string[] | undefined

      // Always invalidate so the calendar refetches
      qc.invalidateQueries({ queryKey: ['calendar-events'] })

      if (deleted > 0) {
        toast.success(`🗑 Удалено событий: ${deleted}`, { duration: 3000 })
      } else if (payload?.calendarEventsDeleted !== undefined && deleted === 0 && count === 0) {
        // Delete was attempted but nothing matched
        toast('🔍 Событий по запросу не найдено', {
          duration: 3000,
          style: { background: '#F3F4F6', color: '#374151', borderRadius: '12px', fontSize: '13px' },
        })
      } else if (count > 0) {
        if (conflicts && conflicts.length > 0) {
          toast(
            `⚠️ Добавлено ${count} событий, но есть конфликт с: ${conflicts.join(', ')}`,
            {
              duration: 6000,
              style: {
                background: '#FEF3C7',
                color: '#92400E',
                border: '1px solid #FDE68A',
                borderRadius: '12px',
                fontSize: '13px',
              },
            }
          )
        } else {
          toast.success(
            `${count} событи${count === 1 ? 'е' : 'й'} добавлено в календарь 📅`,
            { duration: 4000 }
          )
        }
      }
    },

    onError: () => toast.error('Не удалось отправить сообщение'),
  })

  const deleteChatMutation = useMutation({
    mutationFn: (chatId: string) => aiApi.deleteChat(chatId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-chats'] })
      setActiveChatId(null)
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sendMessage.isPending])

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg) return
    let chatId = activeChatId
    if (!chatId) {
      const chat = await createChat.mutateAsync(msg.slice(0, 40))
      chatId = chat.id
    }
    setInput('')
    await sendMessage.mutateAsync({ chatId, message: msg })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-gray-50">

        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-gray-100 flex-col hidden md:flex">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <span className="font-bold text-sm text-gray-900">AI Assistant</span>
              </div>
              <button onClick={() => setShowTutorial(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="How it works">
                <BookOpen size={15} className="text-gray-400" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 border border-violet-100">
              <Zap size={12} className="text-violet-500 shrink-0" />
              <span className="text-[11px] font-semibold text-violet-600">Powered by Groq · Llama 3.3</span>
            </div>
          </div>

          <div className="p-3 border-b border-gray-100">
            <button
              onClick={() => createChat.mutate('New chat')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm shadow-primary-200"
            >
              <Plus size={16} /> New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {loadingChats ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : chats.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
                <MessageSquare size={28} className="opacity-30" />
                <p className="text-xs">No chats yet</p>
              </div>
            ) : (
              chats.map(chat => (
                <div key={chat.id} className="group relative">
                  <button
                    onClick={() => setActiveChatId(chat.id)}
                    className={clsx(
                      'w-full text-left px-4 py-3.5 rounded-2xl transition-all pr-10',
                      activeChatId === chat.id
                        ? 'bg-primary-50 border border-primary-100 shadow-sm'
                        : 'hover:bg-gray-50 border border-transparent'
                    )}
                  >
                    <p className={clsx(
                      'font-semibold text-sm truncate leading-snug',
                      activeChatId === chat.id ? 'text-primary-700' : 'text-gray-800'
                    )}>
                      {chat.title || 'New chat'}
                    </p>
                    {chat.messages[0] && (
                      <p className="text-xs text-gray-400 truncate mt-1 leading-relaxed">
                        {chat.messages[0].content}
                      </p>
                    )}
                  </button>
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      deleteChatMutation.mutate(chat.id)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {!activeChatId ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full gap-6"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-200">
                    <Sparkles size={32} className="text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                    <Zap size={10} className="text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900">AI Study Assistant</h2>
                  <p className="text-gray-500 text-sm mt-1.5 max-w-sm">
                    Планируй, учись, успевай. На базе Groq — отвечает за 1–2 сек.
                    Скажи «добавь в календарь» — событие создастся автоматически.
                  </p>
                  <button onClick={() => setShowTutorial(true)}
                    className="mt-3 text-xs text-primary-600 hover:underline flex items-center gap-1 mx-auto">
                    <BookOpen size={11} /> Как пользоваться?
                  </button>
                </div>

                {/* Calendar tip badge */}
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-50 border border-blue-100 max-w-sm w-full">
                  <CalendarPlus size={14} className="text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-700">
                    Попробуй: <strong>«Добавь пару по математике завтра в 15:00»</strong>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                  {SUGGESTIONS.map(({ icon: Icon, text }) => (
                    <button key={text} onClick={() => handleSend(text)}
                      className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-700 hover:bg-primary-50 hover:border-primary-200 transition-all text-left flex items-start gap-2.5 group">
                      <Icon size={15} className="text-primary-400 mt-0.5 shrink-0 group-hover:text-primary-600 transition-colors" />
                      <span className="text-xs font-medium leading-relaxed">{text}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : loadingMessages ? (
              <div className="flex justify-center pt-10"><Spinner /></div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <MessageSquare size={32} className="opacity-30" />
                <p className="text-sm">Начни разговор</p>
              </div>
            ) : (
              messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
            )}

            {sendMessage.isPending && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-primary-100 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-primary-600" />
                </div>
                <div className="bg-white border border-primary-100/60 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center h-5">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-primary-400"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex gap-2 items-end max-w-3xl mx-auto">
              <textarea
                value={input}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Спроси что угодно или напиши "Добавь пару по физике завтра в 10:00"...'
                rows={1}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-300/60 bg-gray-50 transition-all"
                style={{ minHeight: 44, maxHeight: 120 }}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || sendMessage.isPending}
                className="h-11 w-11 p-0 flex-shrink-0 rounded-2xl"
              >
                {sendMessage.isPending
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Send size={16} />}
              </Button>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Zap size={10} className="text-violet-400" />
              <p className="text-center text-[10px] text-gray-400">
                Powered by <span className="font-semibold text-violet-500">Groq</span> · Llama 3.3 70B · Enter для отправки
              </p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      </AnimatePresence>
    </>
  )
}
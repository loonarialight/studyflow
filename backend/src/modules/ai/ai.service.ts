import Groq from 'groq-sdk'
import { prisma } from '../../config/database'
import { env } from '../../config/env'
import { AppError } from '../../middleware/errorHandler'

const groq  = new Groq({ apiKey: env.GROQ_API_KEY })
const MODEL = 'llama-3.3-70b-versatile'

// ── System prompts ────────────────────────────────────────────────────────────

// Recalculated per-request so dates are always fresh (no stale midnight issue)
const getToday    = () => new Date().toISOString().split('T')[0]
const getTomorrow = () => new Date(Date.now() + 86_400_000).toISOString().split('T')[0]

// today/tomorrow at module level still needed for PARSE_SYSTEM template
const today    = getToday()
const tomorrow = getTomorrow()

/** Build the chat system prompt.
 *  contextNote is kept INSIDE the system block — never appended after —
 *  so the model never sees stray text that breaks JSON-only mode.
 */
function buildChatSystem(
  upcomingEvents: { title: string; startAt: Date }[],
): string {
  const t = getToday()
  const tm = getTomorrow()

  const calendarContext =
    upcomingEvents.length > 0
      ? `\n\nUser's upcoming calendar events (use this to detect conflicts):\n` +
        upcomingEvents
          .map(e => `- "${e.title}" at ${e.startAt.toISOString()}`)
          .join('\n')
      : ''

  return `
You are StudyFlow AI assistant. Today is ${t}, tomorrow is ${tomorrow}.${calendarContext}

== WHEN TO CREATE EVENTS ==
Respond with CREATE_EVENTS JSON ONLY when the user message contains an explicit action verb:
Russian: "добавь", "создай", "запланируй", "поставь", "внеси", "занеси"
English: "add", "create", "schedule", "set", "put", "book"

MUST return JSON:
- "добавь пару по математике завтра в 10:00"
- "schedule a meeting at 3pm"

MUST return plain text (NEVER return JSON for these):
- "какой план на завтра?" → describe calendar as text
- "что у меня запланировано?" → describe calendar as text
- "составь расписание" → give text advice
- "завтрашний план" → describe calendar as text

== JSON FORMAT (only for explicit add/create) ==
Output ONLY this JSON, zero text before or after:
{
  "action": "CREATE_EVENTS",
  "events": [
    {
      "title": "string",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "tag": "study|sport|work|personal|other",
      "color": "#hex"
    }
  ],
  "conflicts": ["existing event title if time overlaps — omit field if no conflicts"],
  "message": "Short confirmation in the user's language. Warn about conflicts if any."
}

== WHEN TO DELETE EVENTS ==
Respond with DELETE_EVENTS JSON when user says: удали / убери / удалить / delete / remove / erase

EXAMPLES — these MUST return DELETE_EVENTS JSON, nothing else:
- "удали все woke up"         → titleContains: "woke up"
- "удали пару по математике"  → titleContains: "математике"
- "удали завтрашние события"  → date: "${getTomorrow()}"
- "remove all study sessions" → titleContains: "study"

DELETE_EVENTS JSON (output ONLY this, no text before or after):
{
  "action": "DELETE_EVENTS",
  "filter": {
    "titleContains": "keyword to match event titles (case-insensitive)",
    "date": "YYYY-MM-DD — optional, limit deletion to this date"
  },
  "message": "Подтверждение на языке пользователя"
}

== ALL OTHER REQUESTS ==
Answer as a helpful assistant in the user's language.
Use the calendar context above to describe existing events when the user asks about plans.
`.trim()
}

const PARSE_SYSTEM = `
You are a schedule parser. Extract ALL events from the user's text and return ONLY a JSON array.
No markdown, no code fences, no explanation — raw JSON array only.

Each event must follow this exact shape:
[
  {
    "title": "string",
    "description": "optional string or null",
    "startAt": "YYYY-MM-DDTHH:MM:00.000Z",
    "endAt":   "YYYY-MM-DDTHH:MM:00.000Z",
    "type": "STUDY|TEST|CLASS|PERSONAL|GROUP"
  }
]

Rules:
- If no year is given, use ${today.slice(0, 4)}.
- If no end time is given, add 1 hour to startAt.
- type mapping:
    лекция / lecture / пара → CLASS
    экзамен / зачёт / test / exam → TEST
    самостоятельная / homework / study → STUDY
    группа / group → GROUP
    everything else → PERSONAL
- Output ONLY the JSON array. No extra text whatsoever.
`.trim()

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ParsedEvent {
  title: string
  description?: string
  startAt: string
  endAt: string
  type: 'STUDY' | 'TEST' | 'CLASS' | 'PERSONAL' | 'GROUP'
  color: string
}

export interface DeleteFilter {
  titleContains?: string
  date?: string
  all?: boolean
}

export interface SendMessageResult {
  message: {
    id: string
    chatId: string
    role: string
    content: string
    createdAt: Date
  }
  createdEvents?: ParsedEvent[]
  conflicts?: string[]
  deleteFilter?: DeleteFilter
}

// ── Chats ─────────────────────────────────────────────────────────────────────

export const getChats = async (userId: string) => {
  return prisma.aiChat.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })
}

export const createChat = async (userId: string, title?: string) => {
  return prisma.aiChat.create({
    data: { userId, title: title?.slice(0, 60) || 'New chat' },
    include: { messages: true },
  })
}

export const deleteChat = async (userId: string, chatId: string) => {
  const chat = await prisma.aiChat.findFirst({ where: { id: chatId, userId } })
  if (!chat) throw new AppError('Chat not found', 404)
  await prisma.aiChat.delete({ where: { id: chatId } })
}

// ── Messages ──────────────────────────────────────────────────────────────────

export const getMessages = async (userId: string, chatId: string) => {
  const chat = await prisma.aiChat.findFirst({ where: { id: chatId, userId } })
  if (!chat) throw new AppError('Chat not found', 404)
  return prisma.aiMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
  })
}

export const sendMessage = async (
  userId: string,
  chatId: string,
  content: string,
): Promise<SendMessageResult> => {
  const chat = await prisma.aiChat.findFirst({ where: { id: chatId, userId } })
  if (!chat) throw new AppError('Chat not found', 404)

  // Save user message
  await prisma.aiMessage.create({ data: { chatId, role: 'USER', content } })

  // History for context (last 12 messages)
  const history = await prisma.aiMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
    take: 12,
  })

  // Upcoming events — passed into system prompt for conflict detection
  const upcomingEvents = await prisma.calendarEvent.findMany({
    where: { userId, startAt: { gte: new Date() } },
    orderBy: { startAt: 'asc' },
    take: 10,
    select: { title: true, startAt: true, endAt: true },
  })

  // Build Groq messages — system prompt built fresh with calendar context embedded
  const groqMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: buildChatSystem(upcomingEvents) },
    ...history.slice(0, -1).map(msg => ({
      role: msg.role === 'USER' ? ('user' as const) : ('assistant' as const),
      content: msg.content,
    })),
    { role: 'user', content },
  ]

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: groqMessages,
    max_tokens: 1024,
    temperature: 0.3,
  })

  const rawReply = completion.choices[0]?.message?.content || 'No response'

  // ── Detect CREATE_EVENTS intent ───────────────────────────────────────────
  let replyText = rawReply
  let createdEvents: ParsedEvent[] | undefined
  let conflicts: string[] | undefined

  // Handles both clean JSON and accidental code-fence wrapping
  const jsonMatch = rawReply.match(/\{[\s\S]*"action"\s*:\s*"CREATE_EVENTS"[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.action === 'CREATE_EVENTS' && Array.isArray(parsed.events)) {
        const TAG_COLORS: Record<string, string> = {
          study: '#7C6FE0', sport: '#10B981',
          work: '#3B82F6', personal: '#F59E0B', other: '#6B7280',
        }
        const TAG_TO_TYPE: Record<string, ParsedEvent['type']> = {
          study: 'STUDY', sport: 'PERSONAL',
          work: 'PERSONAL', personal: 'PERSONAL', other: 'PERSONAL',
        }

        createdEvents = parsed.events.map((e: any) => {
          const dateStr  = e.date || getToday()
          // No Z suffix — treat as local time so "10:00" means 10:00 in the user's timezone,
          // not 10:00 UTC (which would be 16:00 in Bishkek UTC+6).
          const startISO = `${dateStr}T${e.startTime ?? '09:00'}:00`
          const endISO   = `${dateStr}T${e.endTime   ?? '10:00'}:00`
          const tag      = (e.tag || 'other').toLowerCase()

          return {
            title:       String(e.title),
            description: e.description ? String(e.description) : undefined,
            startAt:     startISO,
            endAt:       endISO,
            type:        TAG_TO_TYPE[tag] ?? 'PERSONAL',
            color:       e.color || TAG_COLORS[tag] || '#6B7280',
          }
        })

        // Conflict list from AI (titles of clashing existing events)
        if (Array.isArray(parsed.conflicts) && parsed.conflicts.length > 0) {
          conflicts = parsed.conflicts as string[]
        }

        replyText = parsed.message || `Добавлено ${parsed.events.length} событий в календарь ✅`
      }
    } catch {
      // Invalid JSON — treat as regular text reply
    }
  }


  // ── Detect DELETE_EVENTS intent ─────────────────────────────────────────
  let deleteFilter: DeleteFilter | undefined
  if (!createdEvents) {
    // 1. Try to parse JSON from AI response
    const jsonStr = rawReply.replace(/```json|```/g, '').trim()
    const jsonObj  = jsonStr.match(/\{[\s\S]*\}/)
    if (jsonObj) {
      try {
        const parsed = JSON.parse(jsonObj[0])
        if (parsed.action === 'DELETE_EVENTS' && parsed.filter) {
          deleteFilter = parsed.filter as DeleteFilter
          replyText    = parsed.message || 'Выполняю удаление...'
        }
      } catch { /* fall through */ }
    }

    // 2. Fallback: if AI ignored the JSON format but user clearly asked to delete,
    //    extract the keyword from the USER's message directly
    if (!deleteFilter) {
      const isDeleteIntent = /^(удали|убери|удалить|delete|remove|erase|сотри|отмени)/i.test(content.trim())
      if (isDeleteIntent) {
        // Strip the verb and use the rest as titleContains
        const keyword = content
          .replace(/^(удали|убери|удалить|delete|remove|erase|сотри|отмени)\s+(все\s+|all\s+)?/i, '')
          .replace(/\s+(событи[ея]|tasks?|events?|задач[иу]?).*$/i, '')
          .trim()
        if (keyword.length > 1) {
          deleteFilter = { titleContains: keyword }
          replyText    = `Удаляю события по запросу: «${keyword}»`
        }
      }
    }
  }

  // Save assistant message (display text only, never raw JSON)
  const assistantMsg = await prisma.aiMessage.create({
    data: { chatId, role: 'ASSISTANT', content: replyText },
  })

  // Update chat title on first real exchange
  if (history.length === 1) {
    await prisma.aiChat.update({
      where: { id: chatId },
      data: { title: content.slice(0, 50), updatedAt: new Date() },
    })
  } else {
    await prisma.aiChat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    })
  }

  return { message: assistantMsg, createdEvents, conflicts, deleteFilter }
}

// ── Schedule parsing (text → events) ─────────────────────────────────────────

export async function parseScheduleFromText(text: string): Promise<ParsedEvent[]> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: PARSE_SYSTEM },
      { role: 'user',   content: `Расписание:\n${text}` },
    ],
    max_tokens: 2048,
    temperature: 0.1,
  })

  const raw = completion.choices[0]?.message?.content || ''
  return parseJSON(raw)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJSON(text: string): ParsedEvent[] {
  const TYPE_COLORS: Record<string, string> = {
    STUDY: '#7C6FE0', TEST: '#EF4444',
    CLASS: '#3B82F6', GROUP: '#F59E0B', PERSONAL: '#10B981',
  }

  let clean = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')

  const match = clean.match(/\[[\s\S]*\]/)
  if (match) clean = match[0]

  try {
    const arr = JSON.parse(clean)
    return (Array.isArray(arr) ? arr : [arr])
      .filter((e: any) => e.title && e.startAt)
      .map((e: any) => ({
        title:       String(e.title),
        description: e.description ? String(e.description) : undefined,
        startAt:     e.startAt,
        endAt:       e.endAt || e.startAt,
        type: (['STUDY', 'TEST', 'CLASS', 'PERSONAL', 'GROUP'].includes(e.type)
          ? e.type
          : 'PERSONAL') as ParsedEvent['type'],
        color: TYPE_COLORS[e.type] || '#7C6FE0',
      }))
  } catch {
    throw new AppError('Could not parse schedule. Try a different format.', 422)
  }
}
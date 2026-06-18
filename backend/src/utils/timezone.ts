/**
 * StudyFlow на данный момент работает в одном часовом поясе —
 * Asia/Bishkek (UTC+6, без перехода на летнее время).
 *
 * Строки вида "2026-06-20T09:00" или "2026-06-20T09:00:00" (без "Z" и
 * без offset) приходят с фронтенда (<input type="datetime-local">) и
 * из ai.service.ts (AI-планировщик) и означают wall-clock время
 * пользователя в его часовом поясе.
 *
 * Проблема: `new Date(str)` для строки без offset парсит её как
 * локальное время ПРОЦЕССА Node.js, а не пользователя. Если сервер
 * запущен с системной TZ=UTC (стандартно для Docker/облака/WSL),
 * 09:00 без offset превращается в 09:00 UTC — и при отображении в
 * браузере (UTC+6) событие "уезжает" на +6 часов.
 *
 * Эта функция делает offset явным, чтобы парсинг был корректным
 * независимо от локальной таймзоны сервера.
 */

export const DEFAULT_OFFSET = '+06:00' // Asia/Bishkek, без DST

const HAS_EXPLICIT_OFFSET = /Z$|[+-]\d{2}:\d{2}$/

export function toUserLocalISO(dateTimeStr: string): string {
  if (!dateTimeStr) return dateTimeStr
  if (HAS_EXPLICIT_OFFSET.test(dateTimeStr)) return dateTimeStr // offset уже есть — не трогаем

  // "2026-06-20T09:00"     — из <input type="datetime-local"> (без секунд)
  // "2026-06-20T09:00:00"  — из ai.service.ts (с секундами)
  const withSeconds = dateTimeStr.length === 16 ? `${dateTimeStr}:00` : dateTimeStr
  return `${withSeconds}${DEFAULT_OFFSET}`
}
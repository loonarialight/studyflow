import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, Save, X, ChevronDown } from 'lucide-react'
import { adminApi } from '@/api/admin.api'

interface Chapter { id: string; title: string; subject: { name: string } }
interface Lesson {
  id: string; title: string; content: string | null; videoUrl: string | null
  duration: number | null; order: number; isPublished: boolean
  chapter: { title: string; subject: { name: string } }
  _count: { questions: number }
}

const emptyForm = { title: '', chapterId: '', content: '', videoUrl: '', duration: '', order: 0, isPublished: false }

export default function AdminLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Lesson | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const load = async () => {
  const [l, c] = await Promise.all([adminApi.getLessons(), adminApi.getChapters()])
  setLessons(l.data ?? l)
  setChapters(c.data ?? c)
  setLoading(false)
}
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(emptyForm); setEditing(null); setModal('create') }
  const openEdit = (l: Lesson) => {
    setEditing(l)
    setForm({ title: l.title, chapterId: l.chapter ? '' : '', content: l.content ?? '', videoUrl: l.videoUrl ?? '', duration: l.duration?.toString() ?? '', order: l.order, isPublished: l.isPublished })
    setModal('edit')
  }
  const closeModal = () => { setModal(null); setEditing(null) }

  const save = async () => {
    setSaving(true)
    const data = { ...form, duration: form.duration ? Number(form.duration) : null }
    if (modal === 'create') await adminApi.createLesson(data)
    else await adminApi.updateLesson(editing!.id, data)
    await load()
    closeModal()
    setSaving(false)
  }

  const togglePublish = async (l: Lesson) => {
    await adminApi.publishLesson(l.id, !l.isPublished)
    setLessons((prev) => prev.map((x) => x.id === l.id ? { ...x, isPublished: !x.isPublished } : x))
  }

  const remove = async (id: string) => {
    if (!confirm('Удалить урок?')) return
    await adminApi.deleteLesson(id)
    setLessons((prev) => prev.filter((l) => l.id !== id))
  }

  const insertFormat = (before: string, after = '') => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = form.content.slice(start, end)
    const newContent = form.content.slice(0, start) + before + selected + after + form.content.slice(end)
    setForm((f) => ({ ...f, content: newContent }))
    setTimeout(() => { el.focus(); el.setSelectionRange(start + before.length, start + before.length + selected.length) }, 0)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium text-gray-900">Уроки</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
          <Plus size={16} />
          Новый урок
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Название</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Предмет / Глава</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-400">Вопросы</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-400">Статус</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array(6).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(5).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-3 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : lessons.map((lesson) => (
                  <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{lesson.title}</p>
                      {lesson.videoUrl && <p className="text-xs text-gray-400 mt-0.5">Видео прикреплено</p>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {lesson.chapter.subject.name} / {lesson.chapter.title}
                    </td>
                    <td className="px-5 py-3.5 text-center text-gray-500">{lesson._count.questions}</td>
                    <td className="px-5 py-3.5 text-center">
                      <button onClick={() => togglePublish(lesson)} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors ${lesson.isPublished ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {lesson.isPublished ? <Eye size={12} /> : <EyeOff size={12} />}
                        {lesson.isPublished ? 'Опубликован' : 'Скрыт'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(lesson)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => remove(lesson.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '60px', zIndex: 50 }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 overflow-hidden" style={{ maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-medium text-gray-900">{modal === 'create' ? 'Новый урок' : 'Редактировать урок'}</h2>
              <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
            </div>

            <div className="overflow-auto p-6 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Название урока</label>
                  <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400" placeholder="Тема урока" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Глава</label>
                  <div className="relative">
                    <select value={form.chapterId} onChange={(e) => setForm((f) => ({ ...f, chapterId: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400 appearance-none">
                      <option value="">— выбери главу —</option>
                      {chapters.map((c) => (
  <option key={c.id} value={c.id}>
    {c.subject?.name ?? '—'} / {c.title}
  </option>
))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">YouTube URL</label>
                  <input value={form.videoUrl} onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400" placeholder="https://youtu.be/..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Длительность (мин)</label>
                  <input type="number" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400" placeholder="15" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Теория (HTML/Markdown)</label>
                {/* Toolbar */}
                <div className="flex items-center gap-1 mb-1.5 p-1.5 border border-gray-200 rounded-t-lg bg-gray-50">
                  {[
                    ['B', '**', '**'], ['I', '_', '_'], ['H2', '## ', ''],
                    ['H3', '### ', ''], ['`', '`', '`'], ['```', '```\n', '\n```'],
                  ].map(([label, b, a]) => (
                    <button key={label} type="button" onClick={() => insertFormat(b, a)} className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors">{label}</button>
                  ))}
                </div>
                <textarea
                  ref={textareaRef}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={10}
                  className="w-full border border-gray-200 border-t-0 rounded-b-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary-400 resize-none"
                  placeholder="Теория урока в формате Markdown или HTML..."
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-700">Опубликовать сразу</span>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Отмена</button>
              <button onClick={save} disabled={saving || !form.title || !form.chapterId} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
                <Save size={14} />
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
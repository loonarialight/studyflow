import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Save, X, ChevronRight, ChevronDown } from 'lucide-react'
import { adminApi } from '@/api/admin.api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Track {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  isActive: boolean
  _count: { grades: number }
}

interface Subject {
  id: string
  trackId: string
  grade: number | null
  name: string
  icon: string | null
  color: string
  order: number
  track: { name: string }
  _count: { chapters: number }
}

interface Chapter {
  id: string
  subjectId: string
  title: string
  order: number
  _count: { lessons: number }
}

type Tab = 'tracks' | 'subjects' | 'chapters'

// ─── Empty forms ──────────────────────────────────────────────────────────────

const emptyTrack = { name: '', slug: '', description: '', icon: '' }
const emptySubject = { name: '', trackId: '', grade: '', icon: '', color: '#7C6FE0', order: '0' }
const emptyChapter = { title: '', subjectId: '', order: '0' }

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminSubjects() {
  const [tab, setTab] = useState<Tab>('tracks')

  const [tracks, setTracks] = useState<Track[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])

  const [loading, setLoading] = useState(true)

  // filters
  const [filterTrack, setFilterTrack] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set())

  // modal
  const [modal, setModal] = useState<{ type: Tab; mode: 'create' | 'edit'; id?: string } | null>(null)
  const [trackForm, setTrackForm] = useState(emptyTrack)
  const [subjectForm, setSubjectForm] = useState(emptySubject)
  const [chapterForm, setChapterForm] = useState(emptyChapter)
  const [saving, setSaving] = useState(false)

  // ─── Load ─────────────────────────────────────────────────────────────────

  const loadAll = async () => {
    setLoading(true)
    const [t, s, c] = await Promise.all([
      adminApi.getTracks(),
      adminApi.getSubjects(),
      adminApi.getChapters(),
    ])
    setTracks(t)
    setSubjects(s)
    setChapters(c)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  // ─── Open modals ──────────────────────────────────────────────────────────

  const openTrackCreate = () => { setTrackForm(emptyTrack); setModal({ type: 'tracks', mode: 'create' }) }
  const openTrackEdit = (t: Track) => {
    setTrackForm({ name: t.name, slug: t.slug, description: t.description ?? '', icon: t.icon ?? '' })
    setModal({ type: 'tracks', mode: 'edit', id: t.id })
  }

  const openSubjectCreate = (trackId = '') => {
    setSubjectForm({ ...emptySubject, trackId })
    setModal({ type: 'subjects', mode: 'create' })
  }
  const openSubjectEdit = (s: Subject) => {
    setSubjectForm({ name: s.name, trackId: s.trackId, grade: s.grade?.toString() ?? '', icon: s.icon ?? '', color: s.color, order: s.order.toString() })
    setModal({ type: 'subjects', mode: 'edit', id: s.id })
  }

  const openChapterCreate = (subjectId = '') => {
    setChapterForm({ ...emptyChapter, subjectId })
    setModal({ type: 'chapters', mode: 'create' })
  }
  const openChapterEdit = (c: Chapter) => {
    setChapterForm({ title: c.title, subjectId: c.subjectId, order: c.order.toString() })
    setModal({ type: 'chapters', mode: 'edit', id: c.id })
  }

  const closeModal = () => setModal(null)

  // ─── Save ─────────────────────────────────────────────────────────────────

  const save = async () => {
    if (!modal) return
    setSaving(true)

    if (modal.type === 'tracks') {
      if (modal.mode === 'create') await adminApi.createTrack(trackForm)
      else await adminApi.updateTrack(modal.id!, trackForm)
    }

    if (modal.type === 'subjects') {
      const data = { ...subjectForm, grade: subjectForm.grade ? Number(subjectForm.grade) : null, order: Number(subjectForm.order) }
      if (modal.mode === 'create') await adminApi.createSubject(data)
      else await adminApi.updateSubject(modal.id!, data)
    }

    if (modal.type === 'chapters') {
      const data = { ...chapterForm, order: Number(chapterForm.order) }
      if (modal.mode === 'create') await adminApi.createChapter(data)
      else await adminApi.updateChapter(modal.id!, data)
    }

    await loadAll()
    closeModal()
    setSaving(false)
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  const deleteTrack = async (id: string) => {
    if (!confirm('Удалить направление? Все предметы внутри тоже удалятся.')) return
    await adminApi.deleteTrack(id)
    setTracks((p) => p.filter((t) => t.id !== id))
  }

  const deleteSubject = async (id: string) => {
    if (!confirm('Удалить предмет? Все главы и уроки внутри тоже удалятся.')) return
    await adminApi.deleteSubject(id)
    setSubjects((p) => p.filter((s) => s.id !== id))
  }

  const deleteChapter = async (id: string) => {
    if (!confirm('Удалить главу?')) return
    await adminApi.deleteChapter(id)
    setChapters((p) => p.filter((c) => c.id !== id))
  }

  // ─── Filtered data ────────────────────────────────────────────────────────

  const filteredSubjects = filterTrack ? subjects.filter((s) => s.trackId === filterTrack) : subjects
  const filteredChapters = filterSubject ? chapters.filter((c) => c.subjectId === filterSubject) : chapters

  // ─── Tabs config ──────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'tracks', label: 'Направления', count: tracks.length },
    { key: 'subjects', label: 'Предметы', count: subjects.length },
    { key: 'chapters', label: 'Главы', count: chapters.length },
  ]

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      <h1 className="text-xl font-medium text-gray-900 mb-6">Предметы и контент</h1>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
              tab === key ? 'bg-white text-gray-900 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* ── TRACKS ── */}
      {tab === 'tracks' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={openTrackCreate} className="flex items-center gap-2 bg-primary-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
              <Plus size={15} /> Новое направление
            </button>
          </div>

          <div className="space-y-2">
            {loading ? (
              Array(4).fill(0).map((_, i) => <SkeletonRow key={i} />)
            ) : (
              tracks.map((track) => {
                const isExpanded = expandedTracks.has(track.id)
                const trackSubjects = subjects.filter((s) => s.trackId === track.id)

                return (
                  <div key={track.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <button onClick={() => setExpandedTracks((prev) => { const next = new Set(prev); isExpanded ? next.delete(track.id) : next.add(track.id); return next })} className="text-gray-400 hover:text-gray-600 transition-colors">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <span className="text-lg">{track.icon ?? '📚'}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{track.name}</p>
                        <p className="text-xs text-gray-400">/{track.slug} · {track._count.grades} предметов</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${track.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {track.isActive ? 'Активно' : 'Скрыто'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openSubjectCreate(track.id)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Добавить предмет">
                          <Plus size={14} />
                        </button>
                        <button onClick={() => openTrackEdit(track)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteTrack(track.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-50 bg-gray-50 px-5 py-3 space-y-1.5">
                        {trackSubjects.length === 0 ? (
                          <p className="text-xs text-gray-400 py-1">Предметов нет — нажми + чтобы добавить</p>
                        ) : (
                          trackSubjects.map((s) => (
                            <div key={s.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2">
                              <span className="text-base">{s.icon ?? '📖'}</span>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                              <p className="text-sm text-gray-800 flex-1">{s.name}</p>
                              {s.grade && <span className="text-xs text-gray-400">{s.grade} кл.</span>}
                              <span className="text-xs text-gray-400">{s._count.chapters} глав</span>
                              <button onClick={() => openSubjectEdit(s)} className="p-1 text-gray-300 hover:text-gray-600 transition-colors"><Pencil size={13} /></button>
                              <button onClick={() => deleteSubject(s.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── SUBJECTS ── */}
      {tab === 'subjects' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <select value={filterTrack} onChange={(e) => setFilterTrack(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-400">
              <option value="">Все направления</option>
              {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button onClick={() => openSubjectCreate()} className="flex items-center gap-2 bg-primary-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
              <Plus size={15} /> Новый предмет
            </button>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Предмет</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Направление</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-400">Класс</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-400">Глав</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-400">Порядок</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? Array(6).fill(0).map((_, i) => <SkeletonTableRow key={i} cols={6} />) : filteredSubjects.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                        <span className="text-base">{s.icon ?? '📖'}</span>
                        <span className="font-medium text-gray-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{s.track.name}</td>
                    <td className="px-5 py-3.5 text-center text-gray-500">{s.grade ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center text-gray-500">{s._count.chapters}</td>
                    <td className="px-5 py-3.5 text-center text-gray-400">{s.order}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => { setFilterSubject(s.id); setTab('chapters') }} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Главы предмета">
                          <ChevronRight size={14} />
                        </button>
                        <button onClick={() => openSubjectEdit(s)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => deleteSubject(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CHAPTERS ── */}
      {tab === 'chapters' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-400">
              <option value="">Все предметы</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.track.name} / {s.name}</option>)}
            </select>
            <button onClick={() => openChapterCreate(filterSubject)} className="flex items-center gap-2 bg-primary-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
              <Plus size={15} /> Новая глава
            </button>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Название главы</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-400">Уроков</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-400">Порядок</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? Array(6).fill(0).map((_, i) => <SkeletonTableRow key={i} cols={4} />) : filteredChapters.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{c.title}</td>
                    <td className="px-5 py-3.5 text-center text-gray-500">{c._count.lessons}</td>
                    <td className="px-5 py-3.5 text-center text-gray-400">{c.order}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openChapterEdit(c)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => deleteChapter(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL ── */}
      {modal && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-medium text-gray-900">
                {modal.mode === 'create' ? 'Создать' : 'Редактировать'}{' '}
                {modal.type === 'tracks' ? 'направление' : modal.type === 'subjects' ? 'предмет' : 'главу'}
              </h2>
              <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* Track form */}
              {modal.type === 'tracks' && (
                <>
                  <Field label="Название" value={trackForm.name} onChange={(v) => setTrackForm((f) => ({ ...f, name: v }))} placeholder="HighSchool" />
                  <Field label="Slug (URL)" value={trackForm.slug} onChange={(v) => setTrackForm((f) => ({ ...f, slug: v }))} placeholder="highschool" />
                  <Field label="Иконка (эмодзи)" value={trackForm.icon} onChange={(v) => setTrackForm((f) => ({ ...f, icon: v }))} placeholder="🏫" />
                  <Field label="Описание" value={trackForm.description} onChange={(v) => setTrackForm((f) => ({ ...f, description: v }))} placeholder="Необязательно" />
                </>
              )}

              {/* Subject form */}
              {modal.type === 'subjects' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Направление</label>
                    <select value={subjectForm.trackId} onChange={(e) => setSubjectForm((f) => ({ ...f, trackId: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400">
                      <option value="">— выбери —</option>
                      {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <Field label="Название предмета" value={subjectForm.name} onChange={(v) => setSubjectForm((f) => ({ ...f, name: v }))} placeholder="Математика" />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Иконка" value={subjectForm.icon} onChange={(v) => setSubjectForm((f) => ({ ...f, icon: v }))} placeholder="📐" />
                    <Field label="Класс (5-12)" value={subjectForm.grade} onChange={(v) => setSubjectForm((f) => ({ ...f, grade: v }))} placeholder="9" type="number" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Цвет</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={subjectForm.color} onChange={(e) => setSubjectForm((f) => ({ ...f, color: e.target.value }))} className="w-10 h-9 rounded cursor-pointer border border-gray-200" />
                        <span className="text-sm text-gray-500">{subjectForm.color}</span>
                      </div>
                    </div>
                    <Field label="Порядок" value={subjectForm.order} onChange={(v) => setSubjectForm((f) => ({ ...f, order: v }))} placeholder="0" type="number" />
                  </div>
                </>
              )}

              {/* Chapter form */}
              {modal.type === 'chapters' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Предмет</label>
                    <select value={chapterForm.subjectId} onChange={(e) => setChapterForm((f) => ({ ...f, subjectId: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400">
                      <option value="">— выбери —</option>
                      {subjects.map((s) => <option key={s.id} value={s.id}>{s.track.name} / {s.name}</option>)}
                    </select>
                  </div>
                  <Field label="Название главы" value={chapterForm.title} onChange={(v) => setChapterForm((f) => ({ ...f, title: v }))} placeholder="Квадратные уравнения" />
                  <Field label="Порядок" value={chapterForm.order} onChange={(v) => setChapterForm((f) => ({ ...f, order: v }))} placeholder="0" type="number" />
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Отмена</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
      />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-3.5 flex items-center gap-3">
      <div className="w-4 h-4 bg-gray-100 rounded animate-pulse" />
      <div className="w-8 h-8 bg-gray-100 rounded animate-pulse" />
      <div className="flex-1">
        <div className="h-3 bg-gray-100 rounded w-32 animate-pulse mb-1.5" />
        <div className="h-3 bg-gray-100 rounded w-20 animate-pulse" />
      </div>
    </div>
  )
}

function SkeletonTableRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array(cols).fill(0).map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <div className="h-3 bg-gray-100 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}
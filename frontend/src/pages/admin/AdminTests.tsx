import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, ChevronDown, GripVertical } from 'lucide-react'
import { adminApi } from '@/api/admin.api'

type QType = 'SINGLE' | 'MULTIPLE' | 'TRUE_FALSE' | 'TEXT'

interface Option { id: string; text: string; isCorrect: boolean }
interface Question {
  id?: string; text: string; type: QType
  options: Option[]; explanation: string; hint: string; points: number; order: number
}
interface Lesson { id: string; title: string; chapter: { title: string; subject: { name: string } } }

const TYPE_LABELS: Record<QType, string> = {
  SINGLE: 'Один ответ', MULTIPLE: 'Несколько ответов',
  TRUE_FALSE: 'Верно/Неверно', TEXT: 'Текстовый ответ',
}

const newQuestion = (order: number): Question => ({
  text: '', type: 'SINGLE',
  options: [
    { id: crypto.randomUUID(), text: '', isCorrect: false },
    { id: crypto.randomUUID(), text: '', isCorrect: false },
  ],
  explanation: '', hint: '', points: 1, order,
})

export default function AdminTests() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selectedLesson, setSelectedLesson] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    adminApi.getLessons().then(setLessons)
  }, [])

  useEffect(() => {
    if (!selectedLesson) return
    adminApi.getQuestions(selectedLesson).then((qs) => {
      if (qs.length === 0) setQuestions([newQuestion(0)])
      else setQuestions(qs.map((q: Question) => ({ ...q, options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as unknown as string) })))
    })
  }, [selectedLesson])

  const addQuestion = () => setQuestions((prev) => [...prev, newQuestion(prev.length)])

  const updateQ = (i: number, patch: Partial<Question>) =>
    setQuestions((prev) => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q))

  const removeQ = (i: number) => setQuestions((prev) => prev.filter((_, idx) => idx !== i))

  const addOption = (qi: number) =>
    updateQ(qi, { options: [...questions[qi].options, { id: crypto.randomUUID(), text: '', isCorrect: false }] })

  const updateOption = (qi: number, oi: number, patch: Partial<Option>) =>
    updateQ(qi, {
      options: questions[qi].options.map((o, idx) => {
        if (idx !== oi) return questions[qi].type === 'SINGLE' && patch.isCorrect ? { ...o, isCorrect: false } : o
        return { ...o, ...patch }
      }),
    })

  const removeOption = (qi: number, oi: number) =>
    updateQ(qi, { options: questions[qi].options.filter((_, idx) => idx !== oi) })

  const handleTypeChange = (qi: number, type: QType) => {
    let options: Option[] = questions[qi].options
    if (type === 'TRUE_FALSE') {
      options = [
        { id: crypto.randomUUID(), text: 'Верно', isCorrect: true },
        { id: crypto.randomUUID(), text: 'Неверно', isCorrect: false },
      ]
    } else if (type === 'TEXT') {
      options = []
    }
    updateQ(qi, { type, options })
  }

  const save = async () => {
    if (!selectedLesson) return
    setSaving(true)
    await adminApi.bulkSaveQuestions(selectedLesson, questions.map((q, i) => ({ ...q, order: i })))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium text-gray-900">Тесты и вопросы</h1>
        {selectedLesson && (
          <div className="flex items-center gap-2">
            <button onClick={addQuestion} className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Plus size={15} />
              Добавить вопрос
            </button>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-primary-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors">
              <Save size={15} />
              {saved ? 'Сохранено!' : saving ? 'Сохранение...' : 'Сохранить всё'}
            </button>
          </div>
        )}
      </div>

      {/* Lesson selector */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6">
        <label className="block text-xs font-medium text-gray-500 mb-2">Выбери урок</label>
        <div className="relative max-w-sm">
          <select value={selectedLesson} onChange={(e) => setSelectedLesson(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:border-primary-400">
            <option value="">— выбери урок —</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>{l.chapter?.subject?.name} / {l.title}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Questions */}
      {selectedLesson && (
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={qi} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
                <GripVertical size={14} className="text-gray-300" />
                <span className="text-xs font-medium text-gray-400">Вопрос {qi + 1}</span>
                <div className="flex-1" />
                <div className="relative">
                  <select value={q.type} onChange={(e) => handleTypeChange(qi, e.target.value as QType)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 appearance-none pr-6 focus:outline-none focus:border-primary-400">
                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <input type="number" value={q.points} onChange={(e) => updateQ(qi, { points: Number(e.target.value) })} className="w-14 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400 text-center" min={1} />
                <span className="text-xs text-gray-400">балл</span>
                <button onClick={() => removeQ(qi)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <textarea value={q.text} onChange={(e) => updateQ(qi, { text: e.target.value })} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none" placeholder="Текст вопроса..." />

                {/* Options */}
                {q.type !== 'TEXT' && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500">Варианты ответов (отметь правильный)</p>
                    {q.options.map((opt, oi) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <input
                          type={q.type === 'MULTIPLE' ? 'checkbox' : 'radio'}
                          name={`q-${qi}`}
                          checked={opt.isCorrect}
                          onChange={(e) => updateOption(qi, oi, { isCorrect: e.target.checked })}
                          className="accent-primary-600"
                        />
                        <input value={opt.text} onChange={(e) => updateOption(qi, oi, { text: e.target.value })} className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary-400" placeholder={`Вариант ${oi + 1}`} disabled={q.type === 'TRUE_FALSE'} />
                        {q.type !== 'TRUE_FALSE' && (
                          <button onClick={() => removeOption(qi, oi)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
                        )}
                      </div>
                    ))}
                    {q.type !== 'TRUE_FALSE' && (
                      <button onClick={() => addOption(qi)} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                        <Plus size={12} />
                        Добавить вариант
                      </button>
                    )}
                  </div>
                )}

                {q.type === 'TEXT' && (
                  <p className="text-xs text-gray-400">Студент введёт ответ вручную — проверяется преподавателем.</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Подсказка</label>
                    <input value={q.hint} onChange={(e) => updateQ(qi, { hint: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary-400" placeholder="Необязательно" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Объяснение ответа</label>
                    <input value={q.explanation} onChange={(e) => updateQ(qi, { explanation: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary-400" placeholder="Показывается после ответа" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button onClick={addQuestion} className="w-full border border-dashed border-gray-200 text-gray-400 text-sm py-4 rounded-xl hover:border-primary-300 hover:text-primary-500 transition-colors flex items-center justify-center gap-2">
            <Plus size={16} />
            Добавить вопрос
          </button>
        </div>
      )}
    </div>
  )
}
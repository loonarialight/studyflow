import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, ChevronRight, Lightbulb } from 'lucide-react'
import toast from 'react-hot-toast'
import { learnApi } from '../../api/admin.api'
import { Card, Button, Spinner } from '../../shared/components/ui'

import { marked } from 'marked'

type Tab = 'theory' | 'test'

export const LearnLessonPage = () => {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [tab, setTab] = useState<Tab>('theory')
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [hints, setHints] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['learn-lesson', lessonId],
    queryFn: () => learnApi.getLesson(lessonId!).then(r => r.data.data),
    enabled: !!lessonId,
  })

  const submitMutation = useMutation({
    mutationFn: () => learnApi.submitTest(lessonId!, answers).then(r => r.data.data),
    onSuccess: (data) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['learn-lesson', lessonId] })
      qc.invalidateQueries({ queryKey: ['learn-subject'] })
    },
    onError: () => toast.error('Failed to submit test'),
  })

  const completeMutation = useMutation({
    mutationFn: () => learnApi.completeLesson(lessonId!).then(r => r.data),
    onSuccess: () => {
      toast.success('Lesson completed! 🎉')
      navigate(-1)
    },
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  )

  const lesson = data?.lesson
  const questions = data?.questions ?? []
  const hasTest = questions.length > 0

  const toggleAnswer = (questionId: string, optionId: string, type: string) => {
    setAnswers(prev => {
      const current = prev[questionId] ?? []
      if (type === 'SINGLE' || type === 'TRUE_FALSE') {
        return { ...prev, [questionId]: [optionId] }
      }
      return {
        ...prev,
        [questionId]: current.includes(optionId)
          ? current.filter(id => id !== optionId)
          : [...current, optionId],
      }
    })
  }

  const allAnswered = questions.every((q: any) => (answers[q.id]?.length ?? 0) > 0)

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\n?#]+)/)
    return match?.[1]
  }

  return (
    <div className="p-6 space-y-6 animate-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900">{lesson?.title}</h1>
          {lesson?.duration && <p className="text-sm text-gray-400 mt-0.5">{lesson.duration} min read</p>}
        </div>
        {lesson?.progress?.isCompleted && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle size={16} />
            <span>Completed</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      {hasTest && (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {(['theory', 'test'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm rounded-lg transition-colors capitalize ${
                tab === t ? 'bg-white text-gray-900 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'theory' ? 'Theory' : `Test (${questions.length})`}
            </button>
          ))}
        </div>
      )}

      {/* ── THEORY TAB ── */}
      {tab === 'theory' && (
        <div className="space-y-4">
          {/* Video */}
          {lesson?.videoUrl && (
            <div className="rounded-2xl overflow-hidden aspect-video bg-gray-900">
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(lesson.videoUrl)}`}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          )}

          {/* Theory content */}
          {lesson?.content && (
  <Card className="p-6">
    <div
      className="prose prose-gray max-w-none text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: marked(lesson.content) }}
    />
  </Card>
)}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {hasTest ? (
              <Button onClick={() => setTab('test')} className="gap-2">
                Go to Test <ChevronRight size={16} />
              </Button>
            ) : (
              <Button
                onClick={() => completeMutation.mutate()}
                loading={completeMutation.isPending}
                className="gap-2"
              >
                <CheckCircle size={16} />
                Mark as Complete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── TEST TAB ── */}
      {tab === 'test' && (
        <div className="space-y-5">
          {result ? (
            /* Result screen */
            <Card className={`p-8 text-center ${result.passed ? 'border-green-200' : 'border-red-200'}`}>
              <div className={`text-5xl mb-4`}>{result.passed ? '🎉' : '😔'}</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {result.score} / {result.total} points
              </h2>
              <p className={`text-sm font-medium mb-6 ${result.passed ? 'text-green-600' : 'text-red-500'}`}>
                {result.passed ? 'Passed! Great job!' : 'Not passed. Try again!'}
              </p>
              <div className="flex gap-3 justify-center">
                {!result.passed && (
                  <Button variant="outline" onClick={() => { setAnswers({}); setResult(null) }}>
                    Try Again
                  </Button>
                )}
                {result.passed && (
                  <Button onClick={() => completeMutation.mutate()} loading={completeMutation.isPending} className="gap-2">
                    <CheckCircle size={16} /> Complete Lesson
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <>
              {questions.map((q: any, qi: number) => {
                const options = Array.isArray(q.options) ? q.options : JSON.parse(q.options)
                const showHint = hints.has(q.id)

                return (
                  <Card key={q.id} className="p-5 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-400 mt-0.5 flex-shrink-0">{qi + 1}.</span>
                      <p className="text-sm font-medium text-gray-900">{q.text}</p>
                    </div>

                    {q.type !== 'TEXT' && (
                      <div className="space-y-2 pl-4">
                        {options.map((opt: any) => {
                          const selected = answers[q.id]?.includes(opt.id)
                          return (
                            <button
                              key={opt.id}
                              onClick={() => toggleAnswer(q.id, opt.id, q.type)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm text-left transition-colors ${
                                selected
                                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                selected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                              }`}>
                                {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              {opt.text}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {q.type === 'TEXT' && (
                      <textarea
                        value={answers[q.id]?.[0] ?? ''}
                        onChange={e => setAnswers(prev => ({ ...prev, [q.id]: [e.target.value] }))}
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none"
                        placeholder="Your answer..."
                      />
                    )}

                    {q.hint && (
                      <div className="pl-4">
                        {showHint ? (
                          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                            <Lightbulb size={13} className="flex-shrink-0 mt-0.5" />
                            <span>{q.hint}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setHints(prev => new Set([...prev, q.id]))}
                            className="text-xs text-gray-400 hover:text-amber-600 flex items-center gap-1 transition-colors"
                          >
                            <Lightbulb size={12} /> Show hint
                          </button>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}

              <Button
                onClick={() => submitMutation.mutate()}
                loading={submitMutation.isPending}
                disabled={!allAnswered}
                className="w-full"
              >
                Submit Test
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
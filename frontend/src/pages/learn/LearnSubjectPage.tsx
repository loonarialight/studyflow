import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Circle, PlayCircle, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { learnApi } from '../../api/admin.api'
import { Card, Spinner, Empty } from '../../shared/components/ui'

export const LearnSubjectPage = () => {
  const { trackSlug, subjectId } = useParams<{ trackSlug: string; subjectId: string }>()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['learn-subject', subjectId],
    queryFn: () => learnApi.getSubject(subjectId!).then(r => r.data.data),
    enabled: !!subjectId,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  )

  const subject = data?.subject
  const chapters = data?.chapters ?? []

  const toggleChapter = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const totalLessons = chapters.reduce((acc: number, c: any) => acc + (c.lessons?.length ?? 0), 0)
  const completedLessons = chapters.reduce((acc: number, c: any) =>
    acc + (c.lessons?.filter((l: any) => l.progress?.isCompleted).length ?? 0), 0)

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/learn/${trackSlug}`)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: `${subject?.color ?? '#7C6FE0'}18` }}
          >
            {subject?.icon ?? '📖'}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{subject?.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{completedLessons} of {totalLessons} lessons completed</p>
          </div>
        </div>
      </div>

      {/* Overall progress */}
      {totalLessons > 0 && (
        <Card className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Overall progress</span>
            <span className="font-medium text-gray-900">{Math.round((completedLessons / totalLessons) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                background: subject?.color ?? '#7C6FE0',
                width: `${(completedLessons / totalLessons) * 100}%`
              }}
            />
          </div>
        </Card>
      )}

      {/* Chapters */}
      {chapters.length === 0 ? (
        <Empty icon="📭" title="No lessons yet" description="Content is being added soon!" />
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter: any, ci: number) => {
            const isOpen = expanded.has(chapter.id)
            const lessons = chapter.lessons ?? []
            const done = lessons.filter((l: any) => l.progress?.isCompleted).length

            return (
              <Card key={chapter.id} className="overflow-hidden">
                <button
                  onClick={() => toggleChapter(chapter.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center text-xs font-medium text-primary-600 flex-shrink-0">
                    {ci + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{chapter.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{done}/{lessons.length} lessons</p>
                  </div>
                  {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {lessons.map((lesson: any) => {
                      const isCompleted = lesson.progress?.isCompleted
                      const hasVideo = !!lesson.videoUrl
                      const hasTest = lesson._count?.questions > 0

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => navigate(`/learn/lesson/${lesson.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          {isCompleted
                            ? <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                            : <Circle size={18} className="text-gray-300 flex-shrink-0" />
                          }
                          <div className="flex-1">
                            <p className={`text-sm ${isCompleted ? 'text-gray-500' : 'text-gray-800'} font-medium`}>
                              {lesson.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {hasVideo && <span className="text-xs text-gray-400 flex items-center gap-1"><PlayCircle size={11} /> Video</span>}
                              {hasTest && <span className="text-xs text-gray-400 flex items-center gap-1"><FileText size={11} /> {lesson._count.questions} questions</span>}
                              {lesson.duration && <span className="text-xs text-gray-400">{lesson.duration} min</span>}
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-gray-300" />
                        </button>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
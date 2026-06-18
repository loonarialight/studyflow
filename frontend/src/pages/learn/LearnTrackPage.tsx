import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import { learnApi } from '../../api/admin.api'
import { Card, Spinner, Empty } from '../../shared/components/ui'

export const LearnTrackPage = () => {
  const { trackSlug } = useParams<{ trackSlug: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['learn-subjects', trackSlug],
    queryFn: () => learnApi.getSubjects(trackSlug!).then(r => r.data.data),
    enabled: !!trackSlug,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  )

  const track = data?.track
  const subjects = data?.subjects ?? []

  // Group by grade if exists
  const gradeMap: Record<string, any[]> = {}
  subjects.forEach((s: any) => {
    const key = s.grade ? `${s.grade} grade` : 'General'
    if (!gradeMap[key]) gradeMap[key] = []
    gradeMap[key].push(s)
  })

  return (
    <div className="p-6 space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/learn')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{track?.name ?? trackSlug}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{subjects.length} subjects available</p>
        </div>
      </div>

      {subjects.length === 0 ? (
        <Empty icon="📭" title="No subjects yet" description="Content is being added soon!" />
      ) : (
        Object.entries(gradeMap).map(([grade, items]) => (
          <div key={grade}>
            {Object.keys(gradeMap).length > 1 && (
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">{grade}</h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map((subject: any) => (
                <Card
                  key={subject.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/learn/${trackSlug}/${subject.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${subject.color}18` }}
                    >
                      {subject.icon ?? '📖'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{subject.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{subject._count?.chapters ?? 0} chapters</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                  </div>

                  {/* Progress bar */}
                  {subject.progress && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{subject.progress.lessonsCompleted} / {subject.progress.lessonsTotal} lessons</span>
                        <span>{subject.progress.lessonsTotal > 0
                          ? Math.round((subject.progress.lessonsCompleted / subject.progress.lessonsTotal) * 100)
                          : 0}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            background: subject.color,
                            width: `${subject.progress.lessonsTotal > 0
                              ? (subject.progress.lessonsCompleted / subject.progress.lessonsTotal) * 100
                              : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
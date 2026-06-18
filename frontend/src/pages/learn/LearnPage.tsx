import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, BookOpen } from 'lucide-react'
import { learnApi } from '../../api/admin.api'
import { Card, Spinner, Empty } from '../../shared/components/ui'

const TRACK_COLORS: Record<string, string> = {
  highschool: 'bg-blue-50 text-blue-600',
  university:  'bg-purple-50 text-purple-600',
  toefl:       'bg-amber-50 text-amber-600',
  ielts:       'bg-green-50 text-green-600',
}

export const LearnPage = () => {
  const navigate = useNavigate()

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['learn-tracks'],
    queryFn: () => learnApi.getTracks().then(r => r.data.data),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div className="p-6 space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Learn</h1>
        <p className="text-gray-500 text-sm mt-1">Choose your study direction</p>
      </div>

      {tracks.length === 0 ? (
        <Empty icon="📚" title="No content yet" description="Check back soon!" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tracks.map((track: any) => (
            <Card
              key={track.id}
              className="p-5 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/learn/${track.slug}`)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${TRACK_COLORS[track.slug] ?? 'bg-gray-50 text-gray-500'}`}>
                  {track.icon ?? '📖'}
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-900">{track.name}</h2>
                  {track.description && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{track.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{track._count?.grades ?? 0} subjects</p>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
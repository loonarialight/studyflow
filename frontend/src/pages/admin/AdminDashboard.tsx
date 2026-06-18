import { useEffect, useState } from 'react'
import { BookOpen, FileText, Users, GraduationCap } from 'lucide-react'
import { adminApi } from '@/api/admin.api'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Stats {
  users: number
  tracks: number
  subjects: number
  lessons: number
  questions: number
}

interface RecentUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getDashboard().then((data) => {
      setStats(data.stats)
      setRecentUsers(data.recentUsers)
      setLoading(false)
    })
  }, [])

  const cards = [
    { label: 'Пользователей', value: stats?.users, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Направлений', value: stats?.tracks, icon: GraduationCap, color: 'bg-purple-50 text-purple-600' },
    { label: 'Предметов', value: stats?.subjects, icon: BookOpen, color: 'bg-teal-50 text-teal-600' },
    { label: 'Уроков', value: stats?.lessons, icon: FileText, color: 'bg-amber-50 text-amber-600' },
  ]

  return (
    <div className="p-8">
      <h1 className="text-xl font-medium text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-5">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-medium text-gray-900">
              {loading ? '—' : value?.toLocaleString()}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent users */}
      <div className="bg-white border border-gray-100 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Последние регистрации</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {loading
            ? Array(5).fill(0).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-100 rounded w-32 animate-pulse mb-1.5" />
                    <div className="h-3 bg-gray-100 rounded w-48 animate-pulse" />
                  </div>
                </div>
              ))
            : recentUsers.map((user) => (
                <div key={user.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-xs font-medium text-primary-700">
                    {user.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                  {user.role === 'ADMIN' && (
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Admin</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(user.createdAt), { locale: ru, addSuffix: true })}
                  </span>
                </div>
              ))}
        </div>
      </div>
    </div>
  )
}
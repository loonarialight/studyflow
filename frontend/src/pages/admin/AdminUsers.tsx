import { useEffect, useState } from 'react'
import { Search, Shield, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '@/api/admin.api'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

interface User {
  id: string; name: string; email: string; tag: string
  role: 'USER' | 'ADMIN'; isPremium: boolean; isVerified: boolean
  createdAt: string; _count: { sessions: number; aiChats: number }
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const data = await adminApi.getUsers({ page, search })
    setUsers(data.users)
    setPages(data.pages)
    setTotal(data.total)
    setLoading(false)
  }

  useEffect(() => { load() }, [page, search])

  const toggleRole = async (user: User) => {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
    if (newRole === 'ADMIN' && !confirm(`Сделать ${user.name} администратором?`)) return
    await adminApi.updateUserRole(user.id, newRole)
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u))
  }

  const remove = async (user: User) => {
    if (!confirm(`Удалить пользователя ${user.name}? Это действие необратимо.`)) return
    await adminApi.deleteUser(user.id)
    setUsers((prev) => prev.filter((u) => u.id !== user.id))
    setTotal((t) => t - 1)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Пользователи</h1>
          <p className="text-sm text-gray-400 mt-0.5">Всего: {total}</p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Поиск по имени или email..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:border-primary-400"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Пользователь</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Тег</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-400">Сессии</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-400">Роль</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Регистрация</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array(10).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? '120px' : '60px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center text-xs font-medium text-primary-700 flex-shrink-0">
                          {user.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{user.tag}</td>
                    <td className="px-5 py-3.5 text-center text-gray-500">{user._count.sessions}</td>
                    <td className="px-5 py-3.5 text-center">
                      <button onClick={() => toggleRole(user)} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {user.role === 'ADMIN' && <Shield size={11} />}
                        {user.role}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">
                      {formatDistanceToNow(new Date(user.createdAt), { locale: ru, addSuffix: true })}
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => remove(user)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Страница {page} из {pages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
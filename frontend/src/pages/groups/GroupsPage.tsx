import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Search, Plus, Trophy, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { groupsApi } from '../../api/endpoints'
import { Card, Button, Spinner, Empty, Badge } from '../../shared/components/ui'

export const GroupsPage = () => {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', goal: '' })
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['groups', search],
    queryFn: () => groupsApi.list({ search }).then(r => r.data),
    placeholderData: (prev) => prev,
  })

  const createMutation = useMutation({
    mutationFn: () => groupsApi.create(form).then(r => r.data.data),
    onSuccess: (group) => {
      toast.success('Group created!')
      qc.invalidateQueries({ queryKey: ['groups'] })
      setShowCreate(false)
      navigate(`/groups/${group.id}`)
    },
    onError: () => toast.error('Failed to create group'),
  })

  const joinMutation = useMutation({
    mutationFn: (id: string) => groupsApi.join(id),
    onSuccess: () => {
      toast.success('Joined group!')
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to join'),
  })

  return (
    <div className="p-6 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Study Groups</h1>
          <p className="text-gray-500 text-sm mt-1">Find and join study communities</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus size={16} /> Create
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">Create new group</h3>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Group name" className="input" />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)" className="input" />
          <input value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
            placeholder="Study goal (optional)" className="input" />
          <div className="flex gap-2">
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
              Create
            </Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search groups..."
          className="input pl-10"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
      ) : data?.data?.length === 0 ? (
        <Empty icon="👥" title="No groups found" description="Be the first to create one!" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data?.data?.map((g: any) => (
            <Card key={g.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-primary-600" />
                </div>
                <Badge color="purple">{g._count?.members || 0} members</Badge>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">{g.name}</h3>
                {g.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{g.description}</p>
                )}
                {g.goal && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Trophy size={12} className="text-amber-500" />
                    <span className="text-xs text-amber-700">{g.goal}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => navigate(`/groups/${g.id}`)}
                >
                  <MessageCircle size={13} /> View
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => joinMutation.mutate(g.id)}
                  loading={joinMutation.isPending}
                >
                  Join
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Flame, Clock, BookOpen, Target } from 'lucide-react'
import { analyticsApi } from '../../api/endpoints'
import { Card, Spinner, Badge } from '../../shared/components/ui'

const StatCard = ({ icon: Icon, label, value, sub, color }: any) => (
  <Card className="p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
    </div>
  </Card>
)

export const AnalyticsPage = () => {
  const { data: weekly, isLoading } = useQuery({
    queryKey: ['analytics-weekly'],
    queryFn: () => analyticsApi.weekly().then(r => r.data.data),
  })

  const { data: heatmap = [] } = useQuery({
    queryKey: ['analytics-heatmap'],
    queryFn: () => analyticsApi.heatmap().then(r => r.data.data),
  })

  const today = new Date()
  const from = new Date(today)
  from.setDate(today.getDate() - 6)

  const { data: daily = [] } = useQuery({
    queryKey: ['analytics-daily'],
    queryFn: () =>
      analyticsApi
        .daily(from.toISOString().split('T')[0], today.toISOString().split('T')[0])
        .then(r => r.data.data),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  )

  const chartData = daily.map((d: any) => ({
    day: new Date(d.date).toLocaleDateString('en', { weekday: 'short' }),
    minutes: d.totalMinutes,
  }))

  const totalHours = Math.floor((weekly?.totalMinutes || 0) / 60)
  const totalMin = (weekly?.totalMinutes || 0) % 60

  return (
    <div className="p-6 space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Insights</h1>
        <p className="text-gray-500 text-sm mt-1">Your weekly study overview</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Study time" value={`${totalHours}h ${totalMin}m`}
          sub="this week" color="bg-primary-600" />
        <StatCard icon={Flame} label="Streak" value={`${weekly?.streak || 0} days`}
          sub="keep going!" color="bg-orange-500" />
        <StatCard icon={BookOpen} label="Sessions" value={weekly?.totalSessions || 0}
          sub="this week" color="bg-teal-500" />
        <StatCard icon={Target} label="Daily avg" value={`${weekly?.avgDailyMinutes || 0}m`}
          sub="per day" color="bg-pink-500" />
      </div>

      {/* Bar chart */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Daily study time (last 7 days)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={32}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }}
              tickFormatter={v => `${v}m`} />
            <Tooltip
              formatter={(v: number) => [`${v} min`, 'Study time']}
              contentStyle={{ borderRadius: 12, border: '1px solid #ede9fe', fontSize: 12 }}
            />
            <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
              {chartData.map((_: any, i: number) => (
                <Cell key={i} fill={i === chartData.length - 1 ? '#7F77DD' : '#c4bcf0'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Top subjects */}
      {weekly?.topSubjects?.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top subjects this week</h2>
          <div className="space-y-3">
            {weekly.topSubjects.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800">{s.subject || 'Other'}</span>
                    <span className="text-sm text-gray-500">{s.minutes}m</span>
                  </div>
                  <div className="h-1.5 bg-primary-50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-400 rounded-full"
                      style={{ width: `${Math.min((s.minutes / (weekly.topSubjects[0]?.minutes || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Heatmap */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Activity heatmap</h2>
        <div className="flex flex-wrap gap-1">
          {heatmap.slice(-90).map((d: any) => {
            const intensity = Math.min(d.value / 120, 1)
            const opacity = intensity === 0 ? 0.1 : 0.2 + intensity * 0.8
            return (
              <div
                key={d.date}
                title={`${d.date}: ${d.value}m`}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: `rgba(127, 119, 221, ${opacity})` }}
              />
            )
          })}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-gray-400">Less</span>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map(o => (
            <div key={o} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(127,119,221,${o})` }} />
          ))}
          <span className="text-xs text-gray-400">More</span>
        </div>
      </Card>
    </div>
  )
}

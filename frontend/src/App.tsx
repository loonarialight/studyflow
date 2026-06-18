import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { Layout } from './shared/components/Layout'
import { AuthGuard, GuestGuard } from './shared/components/AuthGuard'

// Auth pages
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { OAuthCallbackPage } from './pages/auth/OAuthCallbackPage'

// App pages
import { CalendarPage } from './pages/calendar/CalendarPage'
import { AnalyticsPage } from './pages/analytics/AnalyticsPage'
import { GroupsPage } from './pages/groups/GroupsPage'
import { AiChatPage } from './pages/more/AiChatPage'
import { TrackingPage } from './pages/more/TrackingPage'

// Admin pages
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminSubjects from './pages/admin/AdminSubjects'
import AdminLessons from './pages/admin/AdminLessons'
import AdminTests from './pages/admin/AdminTests'
import AdminUsers from './pages/admin/AdminUsers'

// Learn pages
import { LearnPage } from './pages/learn/LearnPage'
import { LearnTrackPage } from './pages/learn/LearnTrackPage'
import { LearnSubjectPage } from './pages/learn/LearnSubjectPage'
import { LearnLessonPage } from './pages/learn/LearnLessonPage'
import PlannerPage from './pages/planner/PlannerPage'

// Placeholder pages (to be filled)
 
const MorePage = () => <div className="p-6"><h1 className="text-2xl font-semibold">More</h1><p className="text-gray-500 mt-1">Profile, settings and more</p></div>

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route element={<GuestGuard />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />

          <Route path="/learn" element={<LearnPage />} />
          <Route path="/learn/:trackSlug" element={<LearnTrackPage />} />
          <Route path="/learn/:trackSlug/:subjectId" element={<LearnSubjectPage />} />
          <Route path="/learn/lesson/:lessonId" element={<LearnLessonPage />} />

          {/* Admin — отдельный layout, проверка роли внутри AdminLayout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="subjects" element={<AdminSubjects />} />
            <Route path="lessons" element={<AdminLessons />} />
            <Route path="tests" element={<AdminTests />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          {/* Protected */}
          <Route element={<AuthGuard />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/calendar" replace />} />
              <Route path="/calendar"  element={<CalendarPage />} />
              <Route path="/planner"   element={<PlannerPage />} />
              <Route path="/tracking"  element={<TrackingPage />} />
              <Route path="/learn"     element={<LearnPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/groups"    element={<GroupsPage />} />
              <Route path="/ai"        element={<AiChatPage />} />
              <Route path="/more"      element={<MorePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '12px',
            fontSize: '14px',
            border: '1px solid #ede9fe',
          },
        }}
      />
    </QueryClientProvider>
  )
}
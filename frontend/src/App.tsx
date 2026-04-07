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

// Placeholder pages (to be filled)
const PlannerPage = () => <div className="p-6"><h1 className="text-2xl font-semibold">Planner</h1><p className="text-gray-500 mt-1">Daily task planner coming soon</p></div>
const LearnPage = () => <div className="p-6"><h1 className="text-2xl font-semibold">Learn</h1><p className="text-gray-500 mt-1">Lessons and courses coming soon</p></div>
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

import { Outlet } from 'react-router-dom'
import { Sidebar, BottomNav } from './Sidebar'

export const Layout = () => (
  <div className="min-h-screen bg-[#f5f3ff]">
    <Sidebar />
    <main className="lg:ml-[220px] pb-20 lg:pb-0 min-h-screen">
      <Outlet />
    </main>
    <BottomNav />
  </div>
)

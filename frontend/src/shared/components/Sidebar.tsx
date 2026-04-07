import { NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  Calendar, BookOpen, BarChart2, Users,
  MoreHorizontal, CheckSquare, Timer, Bot, LogOut
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'

const NAV_ITEMS = [
  { to: '/calendar',  icon: Calendar,      label: 'Calendar'  },
  { to: '/planner',   icon: CheckSquare,   label: 'Planner'   },
  { to: '/tracking',  icon: Timer,         label: 'Tracking'  },
  { to: '/learn',     icon: BookOpen,      label: 'Learn'     },
  { to: '/analytics', icon: BarChart2,     label: 'Insights'  },
  { to: '/groups',    icon: Users,         label: 'Groups'    },
  { to: '/ai',        icon: Bot,           label: 'AI Chat'   },
  { to: '/more',      icon: MoreHorizontal,label: 'More'      },
]

export const Sidebar = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-white border-r border-primary-100 flex flex-col z-30 hidden lg:flex">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-primary-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-sm font-bold">SF</span>
          </div>
          <span className="font-semibold text-gray-900">StudyFlow</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-primary-50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 text-xs font-semibold">
              {user?.name?.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.tag}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </aside>
  )
}

// Mobile bottom nav
export const BottomNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-primary-100 lg:hidden z-30">
    <div className="flex items-center justify-around px-2 py-2">
      {NAV_ITEMS.slice(0, 6).map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all',
              isActive ? 'text-primary-600' : 'text-gray-500'
            )
          }
        >
          <Icon size={20} />
          <span className="text-[10px] font-medium">{label}</span>
        </NavLink>
      ))}
    </div>
  </nav>
)

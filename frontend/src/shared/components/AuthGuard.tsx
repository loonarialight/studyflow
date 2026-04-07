import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'

export const AuthGuard = () => {
  const { accessToken } = useAuthStore()
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />
}

export const GuestGuard = () => {
  const { accessToken } = useAuthStore()
  return !accessToken ? <Outlet /> : <Navigate to="/calendar" replace />
}

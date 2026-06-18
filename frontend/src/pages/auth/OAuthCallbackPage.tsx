import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { Spinner } from '../../shared/components/ui'

export const OAuthCallbackPage = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setTokens } = useAuthStore()

  useEffect(() => {
    const accessToken = params.get('accessToken')
    const refreshToken = params.get('refreshToken')

    if (accessToken && refreshToken) {
      // Decode user info from JWT
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      setTokens(accessToken, refreshToken, {
        id: payload.userId,
        email: payload.email,
        name: payload.name || payload.email,
        isPremium: payload.isPremium ?? false,
        role: payload.role ?? 'USER',
     })
      navigate('/calendar', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f3ff]">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="text-gray-600 mt-3 text-sm">Signing you in...</p>
      </div>
    </div>
  )
}

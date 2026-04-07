import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, AtSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Input } from '../../shared/components/ui'
import { useAuthStore } from '../../store/auth.store'

export const RegisterPage = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', tag: '' })
  const { register, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')
    try {
      await register(form)
      toast.success('Account created! 🎉')
      navigate('/calendar')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f3ff] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold">SF</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Start your learning journey</p>
        </div>

        <div className="bg-white rounded-2xl border border-primary-100 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full name" placeholder="Айдар Бекович" value={form.name}
              onChange={set('name')} icon={<User size={15} />} required />
            <Input label="Email" type="email" placeholder="you@example.com" value={form.email}
              onChange={set('email')} icon={<Mail size={15} />} required />
            <div>
              <Input label="Username tag" placeholder="aidar_study" value={form.tag}
                onChange={set('tag')} icon={<AtSign size={15} />} required />
              <p className="text-xs text-gray-400 mt-1">Used to find you in groups</p>
            </div>
            <Input label="Password" type="password" placeholder="Min. 6 characters"
              value={form.password} onChange={set('password')} icon={<Lock size={15} />} required />
            <Button type="submit" className="w-full" loading={isLoading}>
              Create Account
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            Have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

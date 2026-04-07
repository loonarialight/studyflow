import { forwardRef, ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'

// ─── Button ───────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'
    const variants = {
      primary: 'bg-primary-600 hover:bg-primary-800 text-white',
      ghost: 'hover:bg-primary-50 text-primary-600',
      outline: 'border border-primary-200 hover:bg-primary-50 text-primary-700',
      danger: 'bg-red-500 hover:bg-red-600 text-white',
    }
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    }
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

// ─── Input ────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
        <input
          ref={ref}
          className={clsx(
            'w-full px-4 py-2.5 rounded-xl border text-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent',
            'placeholder:text-gray-400 bg-white',
            error ? 'border-red-400' : 'border-primary-100',
            icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

// ─── Card ─────────────────────────────────────────────────────
interface CardProps { children: ReactNode; className?: string; onClick?: () => void }

export const Card = ({ children, className, onClick }: CardProps) => (
  <div
    onClick={onClick}
    className={clsx(
      'bg-white rounded-2xl border border-primary-100 shadow-sm',
      onClick && 'cursor-pointer hover:shadow-md transition-shadow',
      className
    )}
  >
    {children}
  </div>
)

// ─── Spinner ─────────────────────────────────────────────────
export const Spinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <div className={clsx('border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin', sizes[size])} />
  )
}

// ─── Badge ────────────────────────────────────────────────────
interface BadgeProps { children: ReactNode; color?: 'purple' | 'teal' | 'amber' | 'red' | 'gray' }

export const Badge = ({ children, color = 'purple' }: BadgeProps) => {
  const colors = {
    purple: 'bg-primary-50 text-primary-800',
    teal: 'bg-teal-50 text-teal-800',
    amber: 'bg-amber-50 text-amber-800',
    red: 'bg-red-50 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', colors[color])}>
      {children}
    </span>
  )
}

// ─── Empty State ─────────────────────────────────────────────
export const Empty = ({ icon, title, description }: { icon?: string; title: string; description?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {icon && <div className="text-4xl mb-3">{icon}</div>}
    <p className="font-medium text-gray-700">{title}</p>
    {description && <p className="text-sm text-gray-500 mt-1 max-w-xs">{description}</p>}
  </div>
)

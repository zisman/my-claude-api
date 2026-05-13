import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  minimumRole?: UserRole
  redirectTo?: string
  children?: React.ReactNode
}

export function ProtectedRoute({ minimumRole, redirectTo = '/login', children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, canAccess } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to={redirectTo} replace />

  if (minimumRole && !canAccess(minimumRole)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-3">
        <p className="text-slate-600 font-medium">Access denied</p>
        <p className="text-slate-400 text-sm">You don't have permission to view this page.</p>
      </div>
    )
  }

  return children ? <>{children}</> : <Outlet />
}

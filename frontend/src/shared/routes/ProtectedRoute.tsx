import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface Props {
  allowedRoles: string[]
}

// Maps role -> their home dashboard (used for wrong-role redirects)
const ROLE_HOME: Record<string, string> = {
  promoter: '/promoter/',
  business: '/business/dashboard',
  admin:    '/admin',
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { isAuthenticated, role, isLoading } = useAuth()

  // Wait for AuthContext to rehydrate from localStorage
  if (isLoading) return null

  // Not logged in → send to login
  if (!isAuthenticated || !role) return <Navigate to="/login" replace />

  // Logged in but wrong role → redirect to their own dashboard, not login
  if (!allowedRoles.includes(role)) {
    const home = ROLE_HOME[role] ?? '/login'
    return <Navigate to={home} replace />
  }

  return <Outlet />
}
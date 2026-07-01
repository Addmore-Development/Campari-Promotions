import { createContext, useState, ReactNode, useEffect } from 'react'
import type { AuthContextType, User } from '../types/auth.types'
import { authService } from '../services/authService'

export const AuthContext = createContext<AuthContextType | null>(null)

function buildUserFromSession(s: any): User | null {
  if (s?.loggedIn && s?.email && s?.role) {
    return { id: s.userId || s.email, name: s.name, email: s.email, role: s.role }
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem('hg_session')
    if (!raw) { setLoading(false); return }
    try {
      const data = JSON.parse(raw)
      if (data.loggedIn && data.email && data.role) {
        setUser({
          id:    data.userId || data.email,
          name:  data.name   || data.email,
          email: data.email,
          role:  data.role,
        })
      }
    } catch (e) {
      console.warn('Failed to restore session', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── login: now calls real API instead of reading hg_users ──────────────────
  const login = async (email: string, password: string) => {
    const u = await authService.login(email, password)
    setUser(u)
  }

  const syncSession = () => {
    const raw = localStorage.getItem('hg_session')
    if (raw) {
      try {
        const u = buildUserFromSession(JSON.parse(raw))
        if (u) setUser(u)
      } catch { /* ignore */ }
    }
  }

  const logout = (): void => {
    authService.logout()
    setUser(null)
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div style={{
        background: '#080808',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F4EFE6',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        Loading...
      </div>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role:            user?.role ?? null,
        login,
        logout,
        syncSession,
        isAuthenticated: !!user,
        isLoading:       loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
// src/shared/services/authService.ts
// Replaces the localStorage-based authService bundled inside ProtectedRoute.tsx.
// Keeps the EXACT same export shape so AuthContext and LoginPage work unchanged.

import { apiFetch } from './api'
import type { User } from '../types/auth.types'

const SESSION_KEY = 'hg_session'
const TOKEN_KEY   = 'hg_token'

export interface RegisterPayload {
  name:         string
  email:        string
  password:     string
  role:         string
  phone?:       string
  consentPopia: boolean
  idNumber?:    string
  city?:        string
  companyName?: string
  companyReg?:  string
}

export const authService = {

  login: async (email: string, password: string): Promise<User> => {
    const data = await apiFetch<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    // Store JWT
    localStorage.setItem(TOKEN_KEY, data.token)

    // Store session in same shape as old code so all readers still work
    const role = data.user.role?.toLowerCase() || 'promoter'
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      loggedIn:        true,
      userId:          data.user.id,
      name:            data.user.name,
      email:           data.user.email,
      role,
      status:          data.user.status,
      onboardingStatus: data.user.onboardingStatus,
      companyName:     role === 'business' ? data.user.name : undefined,
    }))

    return {
      id:    data.user.id,
      name:  data.user.name,
      email: data.user.email,
      role,
    }
  },

  register: async (payload: RegisterPayload): Promise<User> => {
    await apiFetch<{ message: string; userId: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    // Auto-login after register
    return authService.login(payload.email, payload.password)
  },

  logout: (): void => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SESSION_KEY)
  },

  isLoggedIn: (): boolean => {
    return !!localStorage.getItem(TOKEN_KEY)
  },

  getCurrentUser: (): User | null => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) return null
      const s = JSON.parse(raw)
      if (!s.loggedIn) return null
      return { id: s.userId || s.email, name: s.name, email: s.email, role: s.role }
    } catch {
      return null
    }
  },
}
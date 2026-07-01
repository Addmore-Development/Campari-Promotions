// src/shared/types/auth.types.ts

export interface User {
  id:    string
  name:  string
  email: string
  role:  string
}

export interface AuthContextType {
  user:            User | null
  role:            string | null   // lowercase: 'promoter' | 'business' | 'admin'
  isAuthenticated: boolean
  isLoading:       boolean
  login:           (email: string, password: string) => Promise<void>
  logout:          () => void
  syncSession?:    () => void
}
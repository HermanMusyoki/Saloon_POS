'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { tokenStorage } from '@/lib/auth/tokens'
import { authApi } from '@/lib/api/auth'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Restore user profile from localStorage (non-sensitive, no tokens)
    const stored = tokenStorage.getUser()
    if (stored) {
      setUser(stored)
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    // Server sets saloonspa_access + saloonspa_refresh as HttpOnly cookies
    const { user: userData } = await authApi.login(email, password)
    tokenStorage.setUser(userData)
    setUser(userData)
  }

  const logout = async () => {
    try {
      // Server blacklists refresh token and clears both cookies
      await authApi.logout()
    } catch {
      // Even if the server call fails, clear local state
    }
    tokenStorage.clearUser()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

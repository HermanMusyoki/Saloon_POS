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
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = tokenStorage.getUser()
    const token = tokenStorage.getAccess()
    if (stored && token) setUser(stored)
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    tokenStorage.setTokens(data.access, data.refresh)
    tokenStorage.setUser(data.user)
    setUser(data.user)
  }

  const logout = async () => {
    const refresh = tokenStorage.getRefresh()
    if (refresh) {
      try {
        await authApi.logout(refresh)
      } catch {
        // ignore logout errors
      }
    }
    tokenStorage.clearTokens()
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

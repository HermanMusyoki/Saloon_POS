import axios from 'axios'
import { apiClient } from './client'
import type { User } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/** Shape returned by the login endpoint after the HttpOnly-cookie migration. */
export interface LoginResult {
  user: User
}

export const authApi = {
  /**
   * Authenticate and receive user info.
   * The server sets saloonspa_access + saloonspa_refresh as HttpOnly cookies.
   * Tokens are never stored in JS memory or localStorage.
   */
  login: async (email: string, password: string): Promise<LoginResult> => {
    const { data } = await axios.post(
      `${API_BASE_URL}/api/v1/auth/login/`,
      { email, password },
      { withCredentials: true },
    )
    return data
  },

  /** Server blacklists the refresh token and clears both cookies. */
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout/', {})
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get('/auth/me/')
    return data
  },

  changePassword: async (old_password: string, new_password: string) => {
    const { data } = await apiClient.post('/auth/change-password/', { old_password, new_password })
    return data
  },

  // ── User management (admin only) ─────────────────────────────────────────
  getUsers: async (): Promise<User[]> => {
    const { data } = await apiClient.get('/auth/users/', { params: { page_size: 200 } })
    return Array.isArray(data) ? data : (data.results ?? [])
  },
  createUser: async (payload: {
    email: string; full_name: string; phone?: string; role: string; password: string
  }): Promise<User> => {
    const { data } = await apiClient.post('/auth/users/', payload)
    return data
  },
  updateUser: async (id: number, payload: Partial<User>): Promise<User> => {
    const { data } = await apiClient.patch(`/auth/users/${id}/`, payload)
    return data
  },
  deactivateUser: async (id: number): Promise<void> => {
    await apiClient.delete(`/auth/users/${id}/`)
  },
}

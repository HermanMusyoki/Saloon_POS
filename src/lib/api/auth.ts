import axios from 'axios'
import { apiClient } from './client'
import type { LoginResponse, User } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/login/`, { email, password })
    return data
  },
  logout: async (refresh: string) => {
    await apiClient.post('/auth/logout/', { refresh })
  },
  me: async (): Promise<User> => {
    const { data } = await apiClient.get('/auth/me/')
    return data
  },
  changePassword: async (old_password: string, new_password: string) => {
    const { data } = await apiClient.post('/auth/change-password/', { old_password, new_password })
    return data
  },
}

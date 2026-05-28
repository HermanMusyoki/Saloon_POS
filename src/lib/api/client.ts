import axios from 'axios'
import { tokenStorage } from '@/lib/auth/tokens'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, attempt token refresh then retry once
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = tokenStorage.getRefresh()
      if (!refresh) {
        tokenStorage.clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      }
      try {
        const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/token/refresh/`, { refresh })
        tokenStorage.setTokens(data.access, data.refresh ?? refresh)
        original.headers.Authorization = `Bearer ${data.access}`
        return apiClient(original)
      } catch {
        tokenStorage.clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

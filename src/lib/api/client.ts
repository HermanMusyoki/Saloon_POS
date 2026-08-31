import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  // Send HttpOnly JWT cookies on every request (Fix 5)
  withCredentials: true,
})

// On 401, silently refresh via the HttpOnly refresh cookie then retry once.
// The refresh token is in an HttpOnly cookie — the browser sends it automatically.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        await axios.post(
          `${API_BASE_URL}/api/v1/auth/token/refresh/`,
          {},
          { withCredentials: true },
        )
        // Server has set a new access cookie — retry the original request
        return apiClient(original)
      } catch {
        // Refresh failed — the session is truly expired
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  },
)

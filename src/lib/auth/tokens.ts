/**
 * Token storage — after the HttpOnly-cookie migration, JWT tokens are
 * managed entirely by the server (Set-Cookie on login / refresh / logout).
 * This module only stores non-sensitive user profile data in localStorage
 * so the UI can display name / role without an extra API call.
 */

const USER_KEY = 'saloonspa_user'

export const tokenStorage = {
  getUser: () => {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  },
  setUser: (user: object) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  clearUser: () => {
    localStorage.removeItem(USER_KEY)
  },
}

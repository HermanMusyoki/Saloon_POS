const ACCESS_KEY = 'saloonspa_access'
const REFRESH_KEY = 'saloonspa_refresh'
const USER_KEY = 'saloonspa_user'
const COOKIE_NAME = 'saloonspa_access'

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
}

export const tokenStorage = {
  getAccess: () => (typeof window !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null),
  getRefresh: () => (typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null),

  setTokens: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
    setCookie(COOKIE_NAME, access, 1) // 1 day — refreshed by interceptor
  },

  clearTokens: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
    deleteCookie(COOKIE_NAME)
  },

  getUser: () => {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  },

  setUser: (user: object) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
}

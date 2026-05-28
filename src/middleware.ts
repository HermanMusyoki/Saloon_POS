import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login']

const ROLE_ROUTES: Record<string, string[]> = {
  admin: ['/dashboard', '/customers', '/appointments', '/services', '/employees', '/pos', '/inventory', '/expenses', '/reports', '/settings'],
  receptionist: ['/dashboard', '/customers', '/appointments', '/pos'],
  cashier: ['/dashboard', '/pos', '/reports'],
  stylist: ['/dashboard', '/appointments'],
}

function getRoleFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role ?? null
  } catch {
    return null
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Read token from cookie (set by AuthProvider on login)
  const token = request.cookies.get('saloonspa_access')?.value

  if (!token || isTokenExpired(token)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const role = getRoleFromToken(token)
  if (!role) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const allowed = ROLE_ROUTES[role] ?? []
  const matchedRoute = allowed.find((r) => pathname.startsWith(r))
  if (!matchedRoute) {
    const fallback = allowed[0] ?? '/login'
    return NextResponse.redirect(new URL(fallback, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}

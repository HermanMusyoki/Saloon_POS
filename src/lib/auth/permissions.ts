import type { UserRole } from '@/types'

/** Routes each role is allowed to access. */
export const ROUTE_ROLES: Record<string, UserRole[]> = {
  '/dashboard':    ['admin', 'receptionist', 'cashier', 'stylist'],
  '/customers':    ['admin', 'receptionist'],
  '/appointments': ['admin', 'receptionist', 'stylist'],
  '/services':     ['admin', 'receptionist'],
  '/employees':    ['admin'],
  '/pos':          ['admin', 'receptionist', 'cashier'],
  '/inventory':    ['admin', 'cashier'],
  '/expenses':     ['admin'],
  '/reports':      ['admin', 'cashier'],
  '/receipts':     ['admin', 'cashier'],
  '/settings':     ['admin'],
}

export function canAccess(pathname: string, role: UserRole): boolean {
  // Find the most specific matching route prefix
  const match = Object.keys(ROUTE_ROLES)
    .filter(r => pathname === r || pathname.startsWith(r + '/'))
    .sort((a, b) => b.length - a.length)[0]

  if (!match) return true // unknown routes are open (will hit 403 from API anyway)
  return ROUTE_ROLES[match].includes(role)
}

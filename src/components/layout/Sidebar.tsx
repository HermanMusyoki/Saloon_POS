'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Scissors,
  UserCog,
  ShoppingCart,
  Package,
  Receipt,
  BarChart3,
  Settings,
  Wallet,
  LogOut,
} from 'lucide-react'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'receptionist', 'cashier', 'stylist'] },
  { label: 'Customers', href: '/customers', icon: Users, roles: ['admin', 'receptionist'] },
  { label: 'Appointments', href: '/appointments', icon: CalendarDays, roles: ['admin', 'receptionist', 'stylist'] },
  { label: 'Services', href: '/services', icon: Scissors, roles: ['admin', 'receptionist'] },
  { label: 'Employees', href: '/employees', icon: UserCog, roles: ['admin'] },
  { label: 'POS', href: '/pos', icon: ShoppingCart, roles: ['admin', 'receptionist', 'cashier'] },
  { label: 'Inventory', href: '/inventory', icon: Package, roles: ['admin'] },
  { label: 'Expenses', href: '/expenses', icon: Wallet, roles: ['admin'] },
  { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'cashier'] },
  { label: 'Receipts', href: '/receipts', icon: Receipt, roles: ['admin', 'cashier'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role)
  )

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center flex-shrink-0">
          <Scissors className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-sm leading-tight">Salon & Spa POS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-rose-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}

'use client'

import { usePathname } from 'next/navigation'
import { Bell, Menu } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/appointments': 'Appointments',
  '/services': 'Services',
  '/employees': 'Employees',
  '/pos': 'Point of Sale',
  '/inventory': 'Inventory',
  '/expenses': 'Expenses',
  '/reports': 'Reports',
  '/receipts': 'Receipts',
  '/settings': 'Settings',
}

interface TopNavProps {
  onMenuClick?: () => void
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  const title =
    Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ?? 'Dashboard'

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1 rounded-lg hover:bg-gray-100 transition"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition">
          <Bell className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-xs font-bold text-white">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.full_name}</span>
        </div>
      </div>
    </header>
  )
}

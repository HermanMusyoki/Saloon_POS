'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { canAccess } from '@/lib/auth/permissions'
import { ShieldX } from 'lucide-react'

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, user, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  if (!canAccess(pathname, user.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-1">
            Your role (<span className="font-medium capitalize">{user.role}</span>) does not have
            permission to view this page.
          </p>
        </div>
        <button
          onClick={() => router.replace('/dashboard')}
          className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition"
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  return <>{children}</>
}

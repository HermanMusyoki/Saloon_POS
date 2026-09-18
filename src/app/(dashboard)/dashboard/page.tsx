'use client'

import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  TrendingUp, Calendar, Users, Wallet,
  ArrowUpRight, Scissors, Clock
} from 'lucide-react'
import { reportsApi } from '@/lib/api/reports'
import { formatCurrency } from '@/lib/utils/format'

const COLORS = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6']

const STATUS_COLORS: Record<string, string> = {
  pending: '#facc15',
  confirmed: '#60a5fa',
  in_progress: '#fb923c',
  completed: '#4ade80',
  cancelled: '#9ca3af',
  no_show: '#f87171',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled', no_show: 'No Show',
}

function KPICard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string
  icon: any; color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: reportsApi.getDashboardSummary,
    refetchInterval: 60000,
  })
  const { data: revenue } = useQuery({
    queryKey: ['revenue-chart'],
    queryFn: () => reportsApi.getRevenueChart(),
  })
  const { data: apptStatus } = useQuery({
    queryKey: ['appt-chart'],
    queryFn: () => reportsApi.getAppointmentsChart(),
  })
  const { data: topServices } = useQuery({
    queryKey: ['top-services'],
    queryFn: () => reportsApi.getTopServices(),
  })

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Today's Revenue" value={formatCurrency(summary?.today_revenue ?? 0)}
          sub="Sales today" icon={TrendingUp} color="bg-rose-50 text-rose-600" />
        <KPICard label="Monthly Revenue" value={formatCurrency(summary?.monthly_revenue ?? 0)}
          sub={`Net: ${formatCurrency(summary?.net_profit ?? 0)}`} icon={Wallet} color="bg-green-50 text-green-600" />
        <KPICard label="Today's Appointments" value={String(summary?.today_appointments ?? 0)}
          sub={`${summary?.pending_appointments ?? 0} pending`} icon={Calendar} color="bg-blue-50 text-blue-600" />
        <KPICard label="Total Customers" value={String(summary?.total_customers ?? 0)}
          sub={`${summary?.walkin_visits_today ?? 0} walk-in${(summary?.walkin_visits_today ?? 0) !== 1 ? 's' : ''} today`}
          icon={Users} color="bg-purple-50 text-purple-600" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue area chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenue ?? []}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={l => `Date: ${l}`} />
              <Area type="monotone" dataKey="revenue" stroke="#f43f5e" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Appointment status pie */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Appointments by Status</h3>
          {apptStatus && apptStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={apptStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70}>
                  {apptStatus.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] ?? COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [v, STATUS_LABEL[n] ?? n]} />
                <Legend formatter={v => STATUS_LABEL[v] ?? v} iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
              No appointment data
            </div>
          )}
        </div>
      </div>

      {/* Top services bar chart */}
      {topServices && topServices.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Top Services by Revenue</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topServices} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="service" width={140} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Bar dataKey="revenue" fill="#f43f5e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick info row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-gray-900">Monthly Expenses</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.monthly_expenses ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpRight className="w-4 h-4 text-green-500" />
            <h3 className="font-semibold text-gray-900">Net Profit</h3>
          </div>
          <p className={`text-2xl font-bold ${(summary?.net_profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(summary?.net_profit ?? 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Revenue minus expenses</p>
        </div>
      </div>
    </div>
  )
}

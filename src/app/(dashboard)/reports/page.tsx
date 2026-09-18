'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { Calendar } from 'lucide-react'
import { reportsApi } from '@/lib/api/reports'
import { formatCurrency } from '@/lib/utils/format'

const COLORS = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6', '#34d399']

function DateFilter({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar className="w-4 h-4 text-gray-400" />
      <input type="date" value={from} onChange={e => onFrom(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
      <span className="text-gray-400 text-sm">to</span>
      <input type="date" value={to} onChange={e => onTo(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
    </div>
  )
}

export default function ReportsPage() {
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)

  const [from, setFrom] = useState(thirtyDaysAgo.toISOString().slice(0, 10))
  const [to, setTo] = useState(today.toISOString().slice(0, 10))

  const { data: revenue } = useQuery({
    queryKey: ['revenue-chart', from, to],
    queryFn: () => reportsApi.getRevenueChart(from, to),
  })
  const { data: topServices } = useQuery({
    queryKey: ['top-services', from, to],
    queryFn: () => reportsApi.getTopServices(from, to),
  })
  const { data: staff } = useQuery({
    queryKey: ['staff-perf', from, to],
    queryFn: () => reportsApi.getStaffPerformance(from, to),
  })
  const { data: expensesSummary } = useQuery({
    queryKey: ['exp-summary', from, to],
    queryFn: () => reportsApi.getExpensesSummary(from, to),
  })

  // Totals
  const totalRevenue = revenue?.reduce((s, d) => s + d.revenue, 0) ?? 0
  const totalExpenses = expensesSummary?.reduce((s, d) => s + d.total, 0) ?? 0

  return (
    <div className="space-y-6">
      {/* Date filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <div className="flex gap-4 text-sm">
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2">
            <span className="text-gray-400">Revenue: </span>
            <span className="font-bold text-rose-600">{formatCurrency(totalRevenue)}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2">
            <span className="text-gray-400">Expenses: </span>
            <span className="font-bold text-amber-600">{formatCurrency(totalExpenses)}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2">
            <span className="text-gray-400">Profit: </span>
            <span className={`font-bold ${totalRevenue - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalRevenue - totalExpenses)}
            </span>
          </div>
        </div>
      </div>

      {/* Revenue line chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Daily Revenue</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={revenue ?? []}>
            <defs>
              <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatCurrency(v)} />
            <Tooltip formatter={(v: any) => formatCurrency(v)} />
            <Area type="monotone" dataKey="revenue" stroke="#f43f5e" strokeWidth={2} fill="url(#revGrad2)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top services */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Top Services</h3>
          {(topServices?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topServices} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v)} />
                <YAxis type="category" dataKey="service" width={130} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">No data</div>
          )}
        </div>

        {/* Expenses breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Expenses by Category</h3>
          {(expensesSummary?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expensesSummary} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80}>
                  {expensesSummary!.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Legend iconSize={8} formatter={v => v.charAt(0).toUpperCase() + v.slice(1)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">No expense data</div>
          )}
        </div>
      </div>

      {/* Staff performance table */}
      {(staff?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Staff Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 font-medium text-gray-500">Staff</th>
                  <th className="text-right py-2 font-medium text-gray-500">Sales</th>
                  <th className="text-right py-2 font-medium text-gray-500">Appointments</th>
                  <th className="text-right py-2 font-medium text-gray-500">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staff!.map((s, i) => (
                  <tr key={i}>
                    <td className="py-2.5 font-medium text-gray-900">{s.name}</td>
                    <td className="py-2.5 text-right text-gray-600">{s.sales_count}</td>
                    <td className="py-2.5 text-right text-gray-600">{s.appt_count}</td>
                    <td className="py-2.5 text-right font-bold text-rose-600">{formatCurrency(s.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Receipt, X, Search, Banknote, Smartphone, CreditCard, Building2,
  User, Scissors, CalendarDays, Hash
} from 'lucide-react'
import { posApi } from '@/lib/api/pos'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import type { Sale } from '@/types'

// ── Payment method display ────────────────────────────────────────────────────
const METHOD_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  cash:  { label: 'Cash',     icon: Banknote,   color: 'text-green-700 bg-green-50'  },
  mpesa: { label: 'M-Pesa',   icon: Smartphone, color: 'text-emerald-700 bg-emerald-50' },
  card:  { label: 'Card',     icon: CreditCard, color: 'text-blue-700 bg-blue-50'    },
  bank:  { label: 'Bank',     icon: Building2,  color: 'text-violet-700 bg-violet-50' },
}

function PaymentBadge({ method }: { method?: string | null }) {
  if (!method) return <span className="text-gray-400 text-xs">—</span>
  const cfg = METHOD_CONFIG[method]
  if (!cfg) return <span className="text-xs capitalize">{method}</span>
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  )
}

// ── Receipt detail modal ──────────────────────────────────────────────────────
function ReceiptModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const method = (sale as any).payment_method as string | undefined

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{sale.receipt_number}</h3>
              <p className="text-xs text-gray-400">{formatDate(sale.sale_date)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer / Employee */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 flex items-center gap-1 mb-1"><User className="w-3 h-3" /> Customer</p>
            <p className="text-sm font-medium text-gray-900">
              {(sale as any).customer_detail?.full_name ?? 'Walk-in'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Scissors className="w-3 h-3" /> Stylist</p>
            <p className="text-sm font-medium text-gray-900">
              {(sale as any).employee_detail?.name ?? '—'}
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="border-t border-b border-gray-100 py-3 mb-4 space-y-2">
          {sale.items?.map(item => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div>
                <span className="text-gray-800 font-medium">{item.item_name}</span>
                <span className="text-gray-400 ml-1.5">× {item.quantity}</span>
              </div>
              <span className="font-medium text-gray-900">{formatCurrency(item.line_total)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-1.5 mb-5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span><span>{formatCurrency(sale.subtotal)}</span>
          </div>
          {parseFloat(sale.discount_amount) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span><span>-{formatCurrency(sale.discount_amount)}</span>
            </div>
          )}
          {parseFloat(sale.tax_amount) > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Tax</span><span>{formatCurrency(sale.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
            <span>Total</span>
            <span className="text-rose-600">{formatCurrency(sale.total_amount)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-4 py-3">
          <span className="text-gray-500">Payment</span>
          <PaymentBadge method={method} />
        </div>

        {sale.notes && (
          <p className="mt-3 text-xs text-gray-500 bg-amber-50 rounded-lg px-3 py-2">{sale.notes}</p>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReceiptsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Sale | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page, search, dateFrom, dateTo],
    queryFn: () => posApi.getSales({
      page: String(page),
      ...(search ? { search } : {}),
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    }),
  })

  const sales = data?.results ?? []

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search receipt # or customer…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
          />
        </div>
        {/* Date range */}
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
              className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
          )}
        </div>
      </div>

      {/* Summary strip */}
      {data && (
        <p className="text-sm text-gray-500">
          {data.count} receipt{data.count !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading receipts…</div>
        ) : sales.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No receipts found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Receipt #</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50/60 transition">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 font-mono text-xs font-medium text-gray-700">
                      <Hash className="w-3 h-3 text-gray-400" />{sale.receipt_number}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-600 text-xs">
                      <CalendarDays className="w-3 h-3 text-gray-400" />
                      {formatDate(sale.sale_date)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-800 font-medium">
                      {(sale as any).customer_detail?.full_name ?? <span className="text-gray-400 italic">Walk-in</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-500">{sale.items?.length ?? 0} item{sale.items?.length !== 1 ? 's' : ''}</span>
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBadge method={(sale as any).payment_method} />
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    {formatCurrency(sale.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(sale)}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium underline underline-offset-2">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Page {page} of {data.total_pages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">
                Previous
              </button>
              <button disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && <ReceiptModal sale={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

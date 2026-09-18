'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search, ShoppingCart, Trash2, Plus, Minus, X,
  CreditCard, Banknote, Smartphone, Building2,
  Receipt, User, Scissors, Package, Loader2, CheckCircle2
} from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { posApi } from '@/lib/api/pos'
import { paymentsApi } from '@/lib/api/payments'
import { servicesApi } from '@/lib/api/services'
import { inventoryApi } from '@/lib/api/inventory'
import { customersApi } from '@/lib/api/customers'
import { employeesApi } from '@/lib/api/employees'
import { formatCurrency } from '@/lib/utils/format'
import type { CartItem, Service, Product, Sale } from '@/types'

type PaymentMethod = 'cash' | 'mpesa' | 'card' | 'bank'

const PAYMENT_ICONS = {
  cash: Banknote,
  mpesa: Smartphone,
  card: CreditCard,
  bank: Building2,
}

// ── Receipt Modal ─────────────────────────────────────────────────────────────
function ReceiptModal({ sale, onClose }: { sale: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-center space-y-1 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-bold text-lg text-gray-900">Sale Complete!</h3>
          <p className="text-sm text-gray-500">{sale.receipt_number}</p>
        </div>

        <div className="space-y-2 border-t border-b border-gray-100 py-3 mb-4">
          {sale.items?.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.item_name} × {item.quantity}</span>
              <span className="font-medium">{formatCurrency(item.line_total)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          {parseFloat(sale.discount_amount) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(sale.discount_amount)}</span>
            </div>
          )}
          {parseFloat(sale.tax_amount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax</span>
              <span>{formatCurrency(sale.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-100">
            <span>Total</span>
            <span className="text-rose-600">{formatCurrency(sale.total_amount)}</span>
          </div>
        </div>

        <button onClick={onClose}
          className="w-full py-2.5 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition">
          Done
        </button>
      </div>
    </div>
  )
}

// ── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({ total, onPay, loading, onClose }: {
  total: number; loading: boolean
  onPay: (method: PaymentMethod, amountPaid: number, phone?: string) => void
  onClose: () => void
}) {
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [amountPaid, setAmountPaid] = useState(String(total.toFixed(2)))
  const [mpesaPhone, setMpesaPhone] = useState('')

  const change = parseFloat(amountPaid || '0') - total
  const isMpesa = method === 'mpesa'
  const canSubmit = isMpesa
    ? mpesaPhone.trim().length >= 9
    : parseFloat(amountPaid || '0') >= total

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg text-gray-900">Payment</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Total due */}
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Amount Due</p>
          <p className="text-3xl font-bold text-rose-600">{formatCurrency(total)}</p>
        </div>

        {/* Method selector */}
        <div className="grid grid-cols-2 gap-2">
          {(['cash', 'mpesa', 'card', 'bank'] as PaymentMethod[]).map(m => {
            const Icon = PAYMENT_ICONS[m]
            return (
              <button key={m} onClick={() => setMethod(m)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition
                  ${method === m ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                <Icon className="w-4 h-4" />
                {m === 'mpesa' ? 'M-Pesa' : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            )
          })}
        </div>

        {/* Amount paid — locked for M-Pesa (STK Push amount = total) */}
        {!isMpesa && (
          <div>
            <label className="text-sm font-medium text-gray-700">Amount Received (KES)</label>
            <input type="number" value={amountPaid}
              onChange={e => setAmountPaid(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400" />
          </div>
        )}

        {/* M-Pesa phone */}
        {isMpesa && (
          <div>
            <label className="text-sm font-medium text-gray-700">Customer Phone</label>
            <input value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)}
              placeholder="07XXXXXXXX"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
            <p className="text-xs text-gray-400 mt-1">An STK Push will be sent to this number.</p>
          </div>
        )}

        {/* Change */}
        {!isMpesa && method === 'cash' && change >= 0 && (
          <div className="flex justify-between font-semibold text-sm bg-green-50 px-3 py-2 rounded-lg">
            <span className="text-green-700">Change</span>
            <span className="text-green-700">{formatCurrency(change)}</span>
          </div>
        )}

        <button
          disabled={loading || !canSubmit}
          onClick={() => onPay(method, isMpesa ? total : parseFloat(amountPaid), mpesaPhone || undefined)}
          className="w-full py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition disabled:opacity-50">
          {loading ? 'Processing…' : isMpesa ? 'Send STK Push' : 'Confirm Payment'}
        </button>
      </div>
    </div>
  )
}

// ── M-Pesa Waiting Modal ───────────────────────────────────────────────────────
function MpesaWaitingModal({ sale, phone, onConfirmed, onCancel }: {
  sale: Sale
  phone: string
  onConfirmed: (completedSale: Sale) => void
  onCancel: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  const [failed, setFailed]       = useState(false)
  const [timedOut, setTimedOut]   = useState(false)
  const [checking, setChecking]   = useState(false)
  const elapsed                   = useRef(0)
  const TIMEOUT_SECS              = 90

  const { data: payments, refetch } = useQuery({
    queryKey: ['sale-payments', sale.id],
    queryFn: () => paymentsApi.getSalePayments(sale.id),
    refetchInterval: (confirmed || failed) ? false : 2000,
  })

  // Watch for terminal states from callback
  useEffect(() => {
    if (confirmed || failed) return
    const done   = payments?.find(p => p.status === 'completed')
    const broken = payments?.find(p => p.status === 'failed')
    if (done) {
      setConfirmed(true)
      posApi.getSale(sale.id).then(onConfirmed)
    } else if (broken) {
      setFailed(true)
    }
  }, [payments, confirmed, failed, sale.id, onConfirmed])

  // Countdown to show "taking too long" hint
  useEffect(() => {
    if (confirmed || failed || timedOut) return
    const id = setInterval(() => {
      elapsed.current += 1
      if (elapsed.current >= TIMEOUT_SECS) {
        setTimedOut(true)
        clearInterval(id)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [confirmed, failed, timedOut])

  const handleCheckStatus = useCallback(async () => {
    const mpesaPayment = payments?.find(p => p.method === 'mpesa')
    if (!mpesaPayment) return
    setChecking(true)
    try {
      const updated = await paymentsApi.queryMpesaStatus(mpesaPayment.id)
      if (updated.status === 'completed') {
        setConfirmed(true)
        posApi.getSale(sale.id).then(onConfirmed)
      } else if (updated.status === 'failed') {
        setFailed(true)
      } else {
        toast.info('Payment still pending — ask the customer to check their phone.')
        // reset timeout so the button re-appears after another 90 s
        elapsed.current = 0
        setTimedOut(false)
        refetch()
      }
    } catch {
      toast.error('Could not reach M-Pesa — please try again.')
    } finally {
      setChecking(false)
    }
  }, [payments, sale.id, onConfirmed, refetch])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 text-center">
        {confirmed ? (
          <>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <p className="font-semibold text-gray-900">Payment confirmed!</p>
          </>
        ) : failed ? (
          <>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <X className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Payment Failed</h3>
              <p className="text-sm text-gray-500 mt-1">The M-Pesa request was declined or cancelled.</p>
            </div>
            <button onClick={onCancel}
              className="w-full py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              Close & Retry
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <Smartphone className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Waiting for M-Pesa</h3>
              <p className="text-sm text-gray-500 mt-1">
                STK Push sent to <span className="font-medium text-gray-700">{phone}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Ask the customer to enter their M-Pesa PIN.</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for confirmation…
            </div>
            {timedOut && (
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="w-full py-2.5 border border-rose-300 rounded-xl text-sm font-medium text-rose-700 hover:bg-rose-50 transition disabled:opacity-50">
                {checking ? 'Checking…' : 'Taking too long? Check Status'}
              </button>
            )}
            <button onClick={onCancel}
              className="text-sm text-gray-400 hover:text-gray-600 transition underline">
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main POS page ─────────────────────────────────────────────────────────────
export default function POSPage() {
  const { items, customerId, employeeId, idempotencyKey, addItem, removeItem, updateQuantity,
    setCustomer, setEmployee, clearCart, totals } = useCartStore()

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services')
  const [showPayment, setShowPayment] = useState(false)
  const [completedSale, setCompletedSale] = useState<Sale | null>(null)
  const [pendingSale, setPendingSale] = useState<{ sale: Sale; phone: string } | null>(null)
  const [overallDiscount, setOverallDiscount] = useState(0)
  const [taxRate, setTaxRate] = useState(0)

  const { data: servicesData } = useQuery({
    queryKey: ['pos-services', search],
    queryFn: () => servicesApi.getServices({ search, page_size: '200', is_active: 'true' }),
  })
  const { data: productsData } = useQuery({
    queryKey: ['pos-products', search],
    queryFn: () => inventoryApi.getProducts({ search, page_size: '200', is_active: 'true' }),
    enabled: activeTab === 'products',
  })
  const { data: custData } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customersApi.getCustomers({ page_size: '300' }),
  })
  const { data: empData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.getEmployees({ page_size: '300' }),
  })

  const pendingPhone = useRef('')

  const checkout = useMutation({
    mutationFn: posApi.checkout,
    onSuccess: (sale) => {
      setShowPayment(false)
      if (sale.payment_status === 'pending') {
        setPendingSale({ sale, phone: pendingPhone.current })
      } else {
        setCompletedSale(sale)
        clearCart()
        setOverallDiscount(0)
        toast.success(`Sale complete — ${sale.receipt_number}`)
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Checkout failed'),
  })

  const handleMpesaConfirmed = (completedSale: Sale) => {
    setCompletedSale(completedSale)
    setPendingSale(null)
    clearCart()
    setOverallDiscount(0)
    toast.success(`M-Pesa confirmed — ${completedSale.receipt_number}`)
  }

  const handleMpesaCancel = () => {
    setPendingSale(null)
    toast.error('M-Pesa payment cancelled')
  }

  const { subtotal, discount: itemDiscounts, total: rawTotal } = totals()
  const afterOverallDiscount = subtotal - itemDiscounts - overallDiscount
  const taxAmount = (afterOverallDiscount * taxRate) / 100
  const grandTotal = afterOverallDiscount + taxAmount

  const handleAddService = (svc: Service) => {
    addItem({
      id: `svc-${svc.id}`,
      item_type: 'service',
      service_id: svc.id,
      name: svc.name,
      unit_price: parseFloat(svc.price),
      quantity: 1,
      discount_amount: 0,
    })
    toast.success(`${svc.name} added`)
  }

  const handleAddProduct = (product: Product) => {
    if (product.stock_quantity <= 0) {
      toast.error(`${product.name} is out of stock`)
      return
    }
    const inCart = items.find(i => i.id === `prd-${product.id}`)?.quantity ?? 0
    if (inCart >= product.stock_quantity) {
      toast.error(`Only ${product.stock_quantity} unit${product.stock_quantity !== 1 ? 's' : ''} available`)
      return
    }
    addItem({
      id: `prd-${product.id}`,
      item_type: 'product',
      product_id: product.id,
      name: product.name,
      unit_price: parseFloat(product.selling_price),
      quantity: 1,
      discount_amount: 0,
      max_quantity: product.stock_quantity,
    })
    toast.success(`${product.name} added`)
  }

  const handlePay = (method: PaymentMethod, amountPaid: number, phone?: string) => {
    pendingPhone.current = phone ?? ''
    checkout.mutate({
      customer_id: customerId,
      employee_id: employeeId,
      items: items.map(i => ({
        item_type: i.item_type,
        service_id: i.service_id ?? null,
        product_id: i.product_id ?? null,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount_amount: i.discount_amount,
      })),
      discount_amount: overallDiscount,
      tax_rate: taxRate,
      payment_method: method,
      amount_paid: amountPaid,
      mpesa_phone: phone,
      idempotencyKey,
    })
  }

  const services = servicesData?.results ?? []

  return (
    <div className="flex gap-4 h-[calc(100vh-9rem)]">
      {/* ── Left: product catalog ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Search + tabs */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search services or products…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
            />
          </div>
          <div className="flex gap-2">
            {(['services', 'products'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition
                  ${activeTab === t ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {t === 'services' ? <Scissors className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Service grid */}
        {activeTab === 'services' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {services.map(svc => (
                <button key={svc.id} onClick={() => handleAddService(svc)}
                  className="text-left p-3 rounded-xl border border-gray-200 hover:border-rose-300 hover:shadow-sm transition group">
                  <div className="w-8 h-8 rounded-lg mb-2 flex items-center justify-center"
                    style={{ backgroundColor: svc.category_color ? `${svc.category_color}20` : '#f9fafb' }}>
                    <Scissors className="w-4 h-4" style={{ color: svc.category_color ?? '#9ca3af' }} />
                  </div>
                  <p className="font-medium text-sm text-gray-900 leading-tight">{svc.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{svc.duration_minutes} min</p>
                  <p className="text-sm font-bold text-rose-600 mt-1">{formatCurrency(svc.price)}</p>
                </button>
              ))}
              {services.length === 0 && (
                <div className="col-span-3 text-center text-gray-400 text-sm py-12">
                  No services found
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(productsData?.results ?? []).map(product => {
                const outOfStock = product.stock_quantity <= 0
                return (
                  <button key={product.id} onClick={() => handleAddProduct(product)}
                    disabled={outOfStock}
                    className={`text-left p-3 rounded-xl border transition group
                      ${outOfStock
                        ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                        : 'border-gray-200 hover:border-rose-300 hover:shadow-sm'}`}>
                    <div className="w-8 h-8 rounded-lg mb-2 bg-blue-50 flex items-center justify-center">
                      <Package className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="font-medium text-sm text-gray-900 leading-tight">{product.name}</p>
                    {product.sku && <p className="text-xs text-gray-400 mt-0.5">{product.sku}</p>}
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm font-bold text-rose-600">{formatCurrency(product.selling_price)}</p>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full
                        ${outOfStock ? 'bg-red-100 text-red-600' : product.is_low_stock ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {outOfStock ? 'Out' : `${product.stock_quantity} left`}
                      </span>
                    </div>
                  </button>
                )
              })}
              {(productsData?.results ?? []).length === 0 && (
                <div className="col-span-3 text-center text-gray-400 text-sm py-12">
                  No products found. Add products in Inventory first.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Right: cart ── */}
      <div className="w-80 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-shrink-0">
        {/* Cart header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-900">Cart</span>
            {items.length > 0 && (
              <span className="ml-auto text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Customer */}
          <div className="mb-2">
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
              <User className="w-3 h-3" /> Customer
            </label>
            <select value={customerId ?? ''} onChange={e => setCustomer(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20">
              <option value="">Walk-in customer</option>
              {(custData?.results ?? []).map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>

          {/* Stylist */}
          <div>
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
              <Scissors className="w-3 h-3" /> Stylist
            </label>
            <select value={employeeId ?? ''} onChange={e => setEmployee(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20">
              <option value="">Select stylist…</option>
              {(empData?.results ?? []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 text-sm">
              <ShoppingCart className="w-12 h-12 mb-2" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map(item => (
                <div key={item.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 flex-1">{item.name}</p>
                    <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
                        className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:border-gray-300 transition">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => {
                          if (item.max_quantity !== undefined && item.quantity >= item.max_quantity) {
                            toast.error(`Only ${item.max_quantity} unit${item.max_quantity !== 1 ? 's' : ''} available`)
                            return
                          }
                          updateQuantity(item.id, item.quantity + 1)
                        }}
                        disabled={item.max_quantity !== undefined && item.quantity >= item.max_quantity}
                        className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:border-gray-300 transition disabled:opacity-40 disabled:cursor-not-allowed">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(item.unit_price * item.quantity - item.discount_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + checkout */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 p-4 space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              {/* Overall discount input */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 flex-1">Discount (KES)</span>
                <input type="number" min="0" value={overallDiscount}
                  onChange={e => setOverallDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-rose-400" />
              </div>

              {/* Tax rate */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 flex-1">Tax (%)</span>
                <input type="number" min="0" max="100" value={taxRate}
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-24 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-rose-400" />
              </div>

              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                <span>Total</span>
                <span className="text-rose-600">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowPayment(true)}
              disabled={items.length === 0}
              className="w-full py-3 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4" /> Charge {formatCurrency(grandTotal)}
            </button>
          </div>
        )}
      </div>

      {/* ── Payment modal ── */}
      {showPayment && (
        <PaymentModal
          total={grandTotal}
          loading={checkout.isPending}
          onPay={handlePay}
          onClose={() => setShowPayment(false)}
        />
      )}

      {/* ── M-Pesa waiting modal ── */}
      {pendingSale && (
        <MpesaWaitingModal
          sale={pendingSale.sale}
          phone={pendingSale.phone}
          onConfirmed={handleMpesaConfirmed}
          onCancel={handleMpesaCancel}
        />
      )}

      {/* ── Receipt modal ── */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  )
}

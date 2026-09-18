'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, AlertTriangle, Package, X,
  TrendingUp, TrendingDown, ArrowUpDown, Truck
} from 'lucide-react'
import { inventoryApi } from '@/lib/api/inventory'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Product, Supplier } from '@/types'

// ── Schemas ───────────────────────────────────────────────────────────────────
const productSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  cost_price: z.coerce.number().min(0).default(0),
  selling_price: z.coerce.number().min(0, 'Price is required'),
  stock_quantity: z.coerce.number().min(0).default(0),
  min_stock_level: z.coerce.number().min(0).default(5),
  supplier: z.preprocess(v => (v === '' || v === undefined) ? null : v, z.coerce.number().positive().nullable().optional()),
  is_active: z.boolean().default(true),
})
type ProductForm = z.infer<typeof productSchema>

const movementSchema = z.object({
  product: z.coerce.number().min(1, 'Product required'),
  movement_type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  reference: z.string().optional(),
  notes: z.string().optional(),
})
type MovementForm = z.infer<typeof movementSchema>

const supplierSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().optional().default(''),
  email: z.string().email('Invalid email').optional().or(z.literal('')).default(''),
  address: z.string().optional().default(''),
})
type SupplierForm = z.infer<typeof supplierSchema>

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [activeTab, setActiveTab] = useState<'products' | 'movements' | 'suppliers'>('products')
  const [productModal, setProductModal] = useState<{ open: boolean; data?: Product }>({ open: false })
  const [movementModal, setMovementModal] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [supplierModal, setSupplierModal] = useState<{ open: boolean; data?: Supplier }>({ open: false })
  const [deleteSupId, setDeleteSupId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, lowStockOnly],
    queryFn: () => inventoryApi.getProducts({
      search, page: String(page),
      ...(lowStockOnly ? { low_stock: 'true' } : {}),
    }),
    enabled: activeTab === 'products',
  })

  const { data: movData, isLoading: movLoading } = useQuery({
    queryKey: ['movements', page],
    queryFn: () => inventoryApi.getMovements({ page: String(page) }),
    enabled: activeTab === 'movements',
  })

  const { data: lowStockData } = useQuery({
    queryKey: ['low-stock'],
    queryFn: inventoryApi.getLowStock,
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => inventoryApi.getSuppliers({ page_size: '200' }),
  })

  const { data: suppliersPage, isLoading: supLoading } = useQuery({
    queryKey: ['suppliers', page],
    queryFn: () => inventoryApi.getSuppliers({ page: String(page) }),
    enabled: activeTab === 'suppliers',
  })

  const invalidateSuppliers = () => {
    qc.invalidateQueries({ queryKey: ['suppliers'] })
    qc.invalidateQueries({ queryKey: ['suppliers-all'] })
  }

  const createSupplier = useMutation({
    mutationFn: (d: SupplierForm) => inventoryApi.createSupplier(d),
    onSuccess: () => { invalidateSuppliers(); setSupplierModal({ open: false }); toast.success('Supplier added') },
    onError: () => toast.error('Failed to add supplier'),
  })

  const updateSupplier = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SupplierForm }) => inventoryApi.updateSupplier(id, data),
    onSuccess: () => { invalidateSuppliers(); setSupplierModal({ open: false }); toast.success('Supplier updated') },
    onError: () => toast.error('Failed to update supplier'),
  })

  const deleteSupplier = useMutation({
    mutationFn: (id: number) => inventoryApi.deleteSupplier(id),
    onSuccess: () => { invalidateSuppliers(); setDeleteSupId(null); toast.success('Supplier removed') },
    onError: () => toast.error('Failed to remove supplier'),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['products'] })
    qc.invalidateQueries({ queryKey: ['low-stock'] })
  }

  const create = useMutation({
    mutationFn: (d: ProductForm) => inventoryApi.createProduct({
      ...d,
      cost_price: String(d.cost_price),
      selling_price: String(d.selling_price),
      stock_quantity: d.stock_quantity,
      supplier: d.supplier || null,
    } as any),
    onSuccess: () => { invalidate(); setProductModal({ open: false }); toast.success('Product added') },
    onError: (err: any) => {
      const detail = err?.response?.data
      const msg = typeof detail === 'string'
        ? detail
        : detail
          ? Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
          : err?.message ?? 'Unknown error'
      toast.error(`Failed to add product: ${msg}`)
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductForm }) =>
      inventoryApi.updateProduct(id, {
        ...data,
        cost_price: String(data.cost_price),
        selling_price: String(data.selling_price),
        supplier: data.supplier || null,
      } as any),
    onSuccess: () => { invalidate(); setProductModal({ open: false }); toast.success('Product updated') },
    onError: () => toast.error('Failed to update product'),
  })

  const remove = useMutation({
    mutationFn: inventoryApi.deleteProduct,
    onSuccess: () => { invalidate(); setDeleteId(null); toast.success('Product removed') },
    onError: () => toast.error('Failed to remove product'),
  })

  const addMovement = useMutation({
    mutationFn: (d: MovementForm) => inventoryApi.addMovement({
      ...d,
      quantity: d.movement_type === 'out' ? -d.quantity : d.quantity,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['low-stock'] })
      setMovementModal(false)
      toast.success('Stock updated')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.quantity?.[0] ?? err?.response?.data?.non_field_errors?.[0] ?? 'Failed to update stock'
      toast.error(msg)
    },
  })

  const productColumns = [
    {
      header: 'Product', cell: (p: Product) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{p.name}</p>
            {p.sku && <p className="text-xs text-gray-400">SKU: {p.sku}</p>}
          </div>
        </div>
      )
    },
    {
      header: 'Price', cell: (p: Product) => (
        <span className="font-medium text-gray-900">{formatCurrency(p.selling_price)}</span>
      )
    },
    {
      header: 'Stock', cell: (p: Product) => (
        <div className="flex items-center gap-2">
          <span className={`font-bold text-lg ${p.is_low_stock ? 'text-red-600' : 'text-gray-900'}`}>
            {p.stock_quantity}
          </span>
          {p.is_low_stock && (
            <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" /> Low
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Supplier', cell: (p: Product) => (
        <span className="text-sm text-gray-500">{p.supplier_name ?? '—'}</span>
      )
    },
    {
      header: 'Status', cell: (p: Product) => (
        <Badge variant={p.is_active ? 'success' : 'secondary'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
      )
    },
    {
      header: '', cell: (p: Product) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => setProductModal({ open: true, data: p })}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteId(p.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ]

  const movementColumns = [
    {
      header: 'Product', cell: (m: any) => (
        <span className="font-medium text-gray-900">{m.product_name}</span>
      )
    },
    {
      header: 'Type', cell: (m: any) => {
        const config = {
          in: { label: 'Stock In', icon: TrendingUp, color: 'text-green-600 bg-green-50' },
          out: { label: 'Stock Out', icon: TrendingDown, color: 'text-red-600 bg-red-50' },
          adjustment: { label: 'Adjustment', icon: ArrowUpDown, color: 'text-blue-600 bg-blue-50' },
        }[m.movement_type as 'in' | 'out' | 'adjustment']
        const Icon = config.icon
        return (
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full w-fit ${config.color}`}>
            <Icon className="w-3 h-3" />{config.label}
          </span>
        )
      }
    },
    {
      header: 'Qty', cell: (m: any) => (
        <span className={`font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {m.quantity > 0 ? '+' : ''}{m.quantity}
        </span>
      )
    },
    {
      header: 'Reference', cell: (m: any) => (
        <span className="text-sm text-gray-500">{m.reference || '—'}</span>
      )
    },
    {
      header: 'Date', cell: (m: any) => (
        <span className="text-xs text-gray-400">{formatDate(m.created_at)}</span>
      )
    },
  ]

  const supplierColumns = [
    {
      header: 'Supplier', cell: (s: Supplier) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Truck className="w-4 h-4 text-violet-600" />
          </div>
          <p className="font-medium text-gray-900">{s.name}</p>
        </div>
      )
    },
    { header: 'Phone', cell: (s: Supplier) => <span className="text-sm text-gray-600">{s.phone || '—'}</span> },
    { header: 'Email', cell: (s: Supplier) => <span className="text-sm text-gray-600">{s.email || '—'}</span> },
    { header: 'Address', cell: (s: Supplier) => <span className="text-sm text-gray-500">{s.address || '—'}</span> },
    {
      header: '', cell: (s: Supplier) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => setSupplierModal({ open: true, data: s })}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteSupId(s.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-4">
      {/* Low stock alert banner */}
      {(lowStockData?.count ?? 0) > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {lowStockData!.count} product{lowStockData!.count !== 1 ? 's' : ''} running low on stock
          </p>
          <button onClick={() => { setLowStockOnly(true); setActiveTab('products') }}
            className="ml-auto text-xs text-amber-700 underline hover:no-underline">View</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-3 justify-between flex-wrap">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          {(['products', 'movements', 'suppliers'] as const).map(t => (
            <button key={t} onClick={() => { setActiveTab(t); setPage(1) }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition
                ${activeTab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {activeTab === 'products' && <>
            <button onClick={() => setMovementModal(true)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
              <ArrowUpDown className="w-4 h-4" /> Adjust Stock
            </button>
            <button onClick={() => setProductModal({ open: true })}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </>}
          {activeTab === 'suppliers' && (
            <button onClick={() => setSupplierModal({ open: true })}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition">
              <Plus className="w-4 h-4" /> Add Supplier
            </button>
          )}
        </div>
      </div>

      {/* Products tab */}
      {activeTab === 'products' && (
        <div className="space-y-3">
          {lowStockOnly && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                Showing low-stock only
              </span>
              <button onClick={() => setLowStockOnly(false)} className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
            </div>
          )}
          <DataTable
            data={data?.results ?? []}
            columns={productColumns}
            isLoading={isLoading}
            searchPlaceholder="Search products, SKU, barcode…"
            onSearch={(q) => { setSearch(q); setPage(1) }}
            searchValue={search}
            totalCount={data?.count}
            page={page}
            totalPages={data?.total_pages}
            onPageChange={setPage}
            emptyMessage="No products yet. Add your first product."
          />
        </div>
      )}

      {/* Movements tab */}
      {activeTab === 'movements' && (
        <DataTable
          data={movData?.results ?? []}
          columns={movementColumns}
          isLoading={movLoading}
          totalCount={movData?.count}
          page={page}
          totalPages={movData?.total_pages}
          onPageChange={setPage}
          emptyMessage="No stock movements yet."
        />
      )}

      {/* Suppliers tab */}
      {activeTab === 'suppliers' && (
        <DataTable
          data={suppliersPage?.results ?? []}
          columns={supplierColumns}
          isLoading={supLoading}
          totalCount={suppliersPage?.count}
          page={page}
          totalPages={suppliersPage?.total_pages}
          onPageChange={setPage}
          emptyMessage="No suppliers yet. Add your first supplier."
        />
      )}

      {/* Product modal */}
      {productModal.open && (
        <ProductModal
          initial={productModal.data}
          suppliers={suppliers?.results ?? []}
          onClose={() => setProductModal({ open: false })}
          onSubmit={(d) => productModal.data
            ? update.mutate({ id: productModal.data.id, data: d })
            : create.mutate(d)}
          loading={create.isPending || update.isPending}
        />
      )}

      {/* Stock movement modal */}
      {movementModal && (
        <StockMovementModal
          products={data?.results ?? []}
          onClose={() => setMovementModal(false)}
          onSubmit={(d) => addMovement.mutate(d)}
          loading={addMovement.isPending}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Remove Product?"
        description="The product will be archived."
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={remove.isPending}
      />

      {supplierModal.open && (
        <SupplierModal
          initial={supplierModal.data}
          onClose={() => setSupplierModal({ open: false })}
          onSubmit={(d) => supplierModal.data
            ? updateSupplier.mutate({ id: supplierModal.data.id, data: d })
            : createSupplier.mutate(d)}
          loading={createSupplier.isPending || updateSupplier.isPending}
        />
      )}

      <ConfirmDialog
        open={deleteSupId !== null}
        title="Remove Supplier?"
        description="The supplier will be removed. Existing products linked to this supplier will not be affected."
        onConfirm={() => deleteSupId && deleteSupplier.mutate(deleteSupId)}
        onCancel={() => setDeleteSupId(null)}
        loading={deleteSupplier.isPending}
      />
    </div>
  )
}

// ── Product form modal ────────────────────────────────────────────────────────
function ProductModal({ initial, suppliers, onClose, onSubmit, loading }: {
  initial?: Product; suppliers: any[]
  onClose: () => void; onSubmit: (d: ProductForm) => void; loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: initial ? {
      name: initial.name, sku: initial.sku, barcode: initial.barcode,
      cost_price: parseFloat(initial.cost_price),
      selling_price: parseFloat(initial.selling_price),
      stock_quantity: initial.stock_quantity,
      min_stock_level: initial.min_stock_level,
      supplier: initial.supplier ?? undefined,
      is_active: initial.is_active,
    } : { is_active: true, min_stock_level: 5, cost_price: 0, selling_price: 0, stock_quantity: 0 },
  })

  return (
    <Modal title={initial ? 'Edit Product' : 'Add Product'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">Product Name *</label>
            <input {...register('name')} placeholder="e.g. Shampoo 500ml"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">SKU</label>
            <input {...register('sku')} placeholder="AUTO-GENERATED"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Barcode</label>
            <input {...register('barcode')} placeholder="Scan or enter barcode"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Cost Price (KES)</label>
            <input {...register('cost_price')} type="number" min="0" step="0.01"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Selling Price (KES) *</label>
            <input {...register('selling_price')} type="number" min="0" step="0.01"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
            {errors.selling_price && <p className="text-xs text-red-500 mt-1">{errors.selling_price.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Stock Quantity</label>
            <input {...register('stock_quantity')} type="number" min="0"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Min Stock Level</label>
            <input {...register('min_stock_level')} type="number" min="0"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">Supplier</label>
            <select {...register('supplier')}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20">
              <option value="">No supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input {...register('is_active')} type="checkbox" id="prod_active" className="rounded border-gray-300 text-rose-600" />
            <label htmlFor="prod_active" className="text-sm text-gray-700">Active</label>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition disabled:opacity-60">
            {loading ? 'Saving…' : initial ? 'Update' : 'Add Product'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Stock movement modal ──────────────────────────────────────────────────────
function StockMovementModal({ products, onClose, onSubmit, loading }: {
  products: Product[]
  onClose: () => void; onSubmit: (d: MovementForm) => void; loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<MovementForm>({
    resolver: zodResolver(movementSchema),
    defaultValues: { movement_type: 'in', quantity: 1 },
  })

  return (
    <Modal title="Adjust Stock" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Product *</label>
          <select {...register('product')}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20">
            <option value="">Select product…</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock_quantity})</option>)}
          </select>
          {errors.product && <p className="text-xs text-red-500 mt-1">{errors.product.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Movement Type</label>
          <select {...register('movement_type')}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20">
            <option value="in">Stock In (receive)</option>
            <option value="out">Stock Out (manual deduction)</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Quantity *</label>
          <input {...register('quantity')} type="number" min="1"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Reference</label>
          <input {...register('reference')} placeholder="e.g. PO#001 or manual count"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Notes</label>
          <textarea {...register('notes')} rows={2}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition disabled:opacity-60">
            {loading ? 'Saving…' : 'Update Stock'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Supplier form modal ───────────────────────────────────────────────────────
function SupplierModal({ initial, onClose, onSubmit, loading }: {
  initial?: Supplier
  onClose: () => void; onSubmit: (d: SupplierForm) => void; loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    defaultValues: initial
      ? { name: initial.name, phone: initial.phone, email: initial.email, address: initial.address }
      : { name: '', phone: '', email: '', address: '' },
  })

  return (
    <Modal title={initial ? 'Edit Supplier' : 'Add Supplier'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Supplier Name *</label>
          <input {...register('name')} placeholder="e.g. Beauty Supplies Ltd"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <input {...register('phone')} placeholder="+254 700 000 000"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input {...register('email')} type="email" placeholder="supplier@example.com"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Address</label>
          <textarea {...register('address')} rows={2} placeholder="Physical address"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition disabled:opacity-60">
            {loading ? 'Saving…' : initial ? 'Update' : 'Add Supplier'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

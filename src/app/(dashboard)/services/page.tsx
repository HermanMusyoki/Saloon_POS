'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Clock } from 'lucide-react'
import { servicesApi } from '@/lib/api/services'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/format'
import type { Service, ServiceCategory } from '@/types'

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  color: z.string().min(4, 'Pick a color'),
})
const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.coerce.number().optional(),
  duration_minutes: z.coerce.number().min(5, 'Min 5 minutes'),
  price: z.coerce.number().min(0, 'Price required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
})
type CategoryForm = z.infer<typeof categorySchema>
type ServiceForm = z.infer<typeof serviceSchema>

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export default function ServicesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'services' | 'categories'>('services')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [serviceModal, setServiceModal] = useState<{ open: boolean; data?: Service }>({ open: false })
  const [categoryModal, setCategoryModal] = useState<{ open: boolean; data?: ServiceCategory }>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'service' | 'category'; id: number } | null>(null)

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', page, search],
    queryFn: () => servicesApi.getServices({ search, page: String(page) }),
  })
  const { data: categoriesData, isLoading: catLoading } = useQuery({
    queryKey: ['service-categories'],
    queryFn: () => servicesApi.getCategories(),
  })

  const createService = useMutation({
    mutationFn: servicesApi.createService,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); setServiceModal({ open: false }); toast.success('Service created') },
    onError: () => toast.error('Failed to create service'),
  })
  const updateService = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Service> }) => servicesApi.updateService(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); setServiceModal({ open: false }); toast.success('Service updated') },
    onError: () => toast.error('Failed to update service'),
  })
  const deleteService = useMutation({
    mutationFn: servicesApi.deleteService,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); setDeleteTarget(null); toast.success('Service deleted') },
    onError: () => toast.error('Failed to delete service'),
  })
  const createCategory = useMutation({
    mutationFn: servicesApi.createCategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-categories'] }); setCategoryModal({ open: false }); toast.success('Category created') },
    onError: () => toast.error('Failed to create category'),
  })
  const updateCategory = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ServiceCategory> }) => servicesApi.updateCategory(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-categories'] }); setCategoryModal({ open: false }); toast.success('Category updated') },
    onError: () => toast.error('Failed to update category'),
  })
  const deleteCategory = useMutation({
    mutationFn: servicesApi.deleteCategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-categories'] }); setDeleteTarget(null); toast.success('Category deleted') },
    onError: () => toast.error('Failed to delete category'),
  })

  const categories = categoriesData?.results ?? []

  const serviceColumns = [
    {
      header: 'Service', cell: (s: Service) => (
        <div>
          <p className="font-medium text-gray-900">{s.name}</p>
          {s.description && <p className="text-xs text-gray-400 truncate max-w-xs">{s.description}</p>}
        </div>
      )
    },
    {
      header: 'Category', cell: (s: Service) => s.category_name ? (
        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium"
          style={{ backgroundColor: (s.category_color ?? '#999') + '20', color: s.category_color ?? '#999' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.category_color ?? '#999' }} />
          {s.category_name}
        </span>
      ) : <span className="text-gray-400 text-xs">—</span>
    },
    {
      header: 'Duration', cell: (s: Service) => (
        <span className="flex items-center gap-1 text-gray-600"><Clock className="w-3.5 h-3.5" />{s.duration_minutes} min</span>
      )
    },
    {
      header: 'Price', cell: (s: Service) => (
        <span className="font-semibold text-gray-900">{formatCurrency(s.price)}</span>
      )
    },
    {
      header: 'Status', cell: (s: Service) => (
        <Badge variant={s.is_active ? 'success' : 'secondary'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
      )
    },
    {
      header: '', cell: (s: Service) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => setServiceModal({ open: true, data: s })}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteTarget({ type: 'service', id: s.id })}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ]

  const categoryColumns = [
    {
      header: 'Category', cell: (c: ServiceCategory) => (
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
          <span className="font-medium">{c.name}</span>
        </div>
      )
    },
    { header: 'Services', cell: (c: ServiceCategory) => <span className="text-gray-600">{c.service_count} services</span> },
    {
      header: '', cell: (c: ServiceCategory) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => setCategoryModal({ open: true, data: c })}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteTarget({ type: 'category', id: c.id })}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['services', 'categories'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'services' ? (
        <DataTable
          data={servicesData?.results ?? []}
          columns={serviceColumns}
          isLoading={servicesLoading}
          searchPlaceholder="Search services…"
          onSearch={(q) => { setSearch(q); setPage(1) }}
          searchValue={search}
          totalCount={servicesData?.count}
          page={page}
          totalPages={servicesData?.total_pages}
          onPageChange={setPage}
          actions={
            <button onClick={() => setServiceModal({ open: true })}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition">
              <Plus className="w-4 h-4" /> Add Service
            </button>
          }
        />
      ) : (
        <DataTable
          data={categories}
          columns={categoryColumns}
          isLoading={catLoading}
          emptyMessage="No categories yet."
          actions={
            <button onClick={() => setCategoryModal({ open: true })}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition">
              <Plus className="w-4 h-4" /> Add Category
            </button>
          }
        />
      )}

      {serviceModal.open && (
        <ServiceModal
          categories={categories}
          initial={serviceModal.data}
          onClose={() => setServiceModal({ open: false })}
          onSubmit={(d) => serviceModal.data
            ? updateService.mutate({ id: serviceModal.data.id, data: d as any })
            : createService.mutate(d as any)}
          loading={createService.isPending || updateService.isPending}
        />
      )}
      {categoryModal.open && (
        <CategoryModal
          initial={categoryModal.data}
          onClose={() => setCategoryModal({ open: false })}
          onSubmit={(d) => categoryModal.data
            ? updateCategory.mutate({ id: categoryModal.data.id, data: d })
            : createCategory.mutate(d)}
          loading={createCategory.isPending || updateCategory.isPending}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.type === 'service' ? 'Service' : 'Category'}?`}
        description="This action cannot be undone."
        onConfirm={() => {
          if (!deleteTarget) return
          deleteTarget.type === 'service' ? deleteService.mutate(deleteTarget.id) : deleteCategory.mutate(deleteTarget.id)
        }}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteService.isPending || deleteCategory.isPending}
      />
    </div>
  )
}

function ServiceModal({ categories, initial, onClose, onSubmit, loading }: {
  categories: ServiceCategory[]; initial?: Service
  onClose: () => void; onSubmit: (data: ServiceForm) => void; loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: initial ? {
      name: initial.name, category: initial.category?.id,
      duration_minutes: initial.duration_minutes, price: parseFloat(initial.price),
      description: initial.description, is_active: initial.is_active,
    } : { is_active: true, duration_minutes: 60 },
  })
  return (
    <Modal title={initial ? 'Edit Service' : 'Add Service'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">Service Name *</label>
            <input {...register('name')} placeholder="e.g. Haircut" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select {...register('category')} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20">
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Duration (mins) *</label>
            <input {...register('duration_minutes')} type="number" min="5" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
            {errors.duration_minutes && <p className="text-xs text-red-500 mt-1">{errors.duration_minutes.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Price (KES) *</label>
            <input {...register('price')} type="number" min="0" step="0.01" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input {...register('is_active')} type="checkbox" id="svc_active" className="rounded border-gray-300 text-rose-600" />
            <label htmlFor="svc_active" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea {...register('description')} rows={2} placeholder="Optional description…" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition disabled:opacity-60">
            {loading ? 'Saving…' : initial ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function CategoryModal({ initial, onClose, onSubmit, loading }: {
  initial?: ServiceCategory; onClose: () => void
  onSubmit: (data: CategoryForm) => void; loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: initial ?? { color: '#6366f1' },
  })
  return (
    <Modal title={initial ? 'Edit Category' : 'Add Category'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Category Name *</label>
          <input {...register('name')} placeholder="e.g. Hair Services" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Color</label>
          <div className="mt-1 flex items-center gap-3">
            <input {...register('color')} type="color" className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
            <input {...register('color')} placeholder="#6366f1" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition disabled:opacity-60">
            {loading ? 'Saving…' : initial ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

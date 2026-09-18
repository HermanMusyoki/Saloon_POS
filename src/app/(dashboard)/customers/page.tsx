'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Star, Phone, Mail } from 'lucide-react'
import { customersApi } from '@/lib/api/customers'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/format'
import type { Customer } from '@/types'

const customerSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  phone: z.string().min(9, 'Valid phone required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  birthday: z.string().optional(),
  notes: z.string().optional(),
})
type CustomerForm = z.infer<typeof customerSchema>

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

export default function CustomersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<{ open: boolean; data?: Customer }>({ open: false })
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => customersApi.getCustomers({ search, page: String(page) }),
  })

  const create = useMutation({
    mutationFn: customersApi.createCustomer,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setModal({ open: false }); toast.success('Customer added') },
    onError: (e: any) => toast.error(e?.response?.data?.phone?.[0] ?? 'Failed to add customer'),
  })
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Customer> }) => customersApi.updateCustomer(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setModal({ open: false }); toast.success('Customer updated') },
    onError: () => toast.error('Failed to update customer'),
  })
  const remove = useMutation({
    mutationFn: customersApi.deleteCustomer,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setDeleteId(null); toast.success('Customer deleted') },
    onError: () => toast.error('Failed to delete customer'),
  })

  const columns = [
    {
      header: 'Customer', cell: (c: Customer) => (
        <div>
          <p className="font-medium text-gray-900">{c.full_name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-gray-400"><Phone className="w-3 h-3" />{c.phone}</span>
            {c.email && <span className="flex items-center gap-1 text-xs text-gray-400"><Mail className="w-3 h-3" />{c.email}</span>}
          </div>
        </div>
      )
    },
    {
      header: 'Gender', cell: (c: Customer) => c.gender
        ? <Badge variant="secondary" className="capitalize">{c.gender}</Badge>
        : <span className="text-gray-400 text-xs">—</span>
    },
    {
      header: 'Birthday', cell: (c: Customer) => c.birthday
        ? <span className="text-gray-600 text-sm">{formatDate(c.birthday)}</span>
        : <span className="text-gray-400 text-xs">—</span>
    },
    {
      header: 'Points', cell: (c: Customer) => (
        <span className="flex items-center gap-1 font-medium text-amber-600">
          <Star className="w-3.5 h-3.5" />{c.loyalty_points}
        </span>
      )
    },
    {
      header: 'Joined', cell: (c: Customer) => (
        <span className="text-gray-500 text-xs">{formatDate(c.created_at)}</span>
      )
    },
    {
      header: '', cell: (c: Customer) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => setModal({ open: true, data: c })}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteId(c.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers', value: data?.count ?? 0, color: 'text-gray-900' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <DataTable
        data={data?.results ?? []}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search by name or phone…"
        onSearch={(q) => { setSearch(q); setPage(1) }}
        searchValue={search}
        totalCount={data?.count}
        page={page}
        totalPages={data?.total_pages}
        onPageChange={setPage}
        emptyMessage="No customers found. Add your first customer."
        actions={
          <button onClick={() => setModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition">
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        }
      />

      {modal.open && (
        <CustomerModal
          initial={modal.data}
          onClose={() => setModal({ open: false })}
          onSubmit={(d) => {
            const payload = { ...d, gender: (d.gender || undefined) as Customer['gender'] }
            modal.data
              ? update.mutate({ id: modal.data.id, data: payload })
              : create.mutate(payload)
          }}
          loading={create.isPending || update.isPending}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Customer?"
        description="This will permanently remove the customer and their records."
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={remove.isPending}
      />
    </div>
  )
}

function CustomerModal({ initial, onClose, onSubmit, loading }: {
  initial?: Customer; onClose: () => void
  onSubmit: (data: CustomerForm) => void; loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: initial ? {
      full_name: initial.full_name, phone: initial.phone,
      email: initial.email, gender: initial.gender as any,
      birthday: initial.birthday ?? '', notes: initial.notes,
    } : {},
  })

  return (
    <Modal title={initial ? 'Edit Customer' : 'Add Customer'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">Full Name *</label>
            <input {...register('full_name')} placeholder="e.g. Jane Doe" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400" />
            {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Phone *</label>
            <input {...register('phone')} placeholder="07XXXXXXXX" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400" />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input {...register('email')} type="email" placeholder="jane@email.com" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Gender</label>
            <select {...register('gender')} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20">
              <option value="">Select gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Birthday</label>
            <input {...register('birthday')} type="date" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Any special notes about this customer…" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition disabled:opacity-60">
            {loading ? 'Saving…' : initial ? 'Update' : 'Add Customer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

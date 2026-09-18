'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Phone, Mail, Percent } from 'lucide-react'
import { employeesApi } from '@/lib/api/employees'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Employee } from '@/types'

const employeeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  role: z.string().optional(),
  salary: z.coerce.number().min(0).default(0),
  commission_pct: z.coerce.number().min(0).max(100).default(0),
  hire_date: z.string().optional(),
  is_active: z.boolean().default(true),
})
type EmployeeForm = z.infer<typeof employeeSchema>

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

export default function EmployeesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<{ open: boolean; data?: Employee }>({ open: false })
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, search],
    queryFn: () => employeesApi.getEmployees({ search, page: String(page) }),
  })

  const create = useMutation({
    mutationFn: employeesApi.createEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setModal({ open: false }); toast.success('Employee added') },
    onError: () => toast.error('Failed to add employee'),
  })
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Employee> }) => employeesApi.updateEmployee(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setModal({ open: false }); toast.success('Employee updated') },
    onError: () => toast.error('Failed to update employee'),
  })
  const remove = useMutation({
    mutationFn: employeesApi.deleteEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setDeleteId(null); toast.success('Employee removed') },
    onError: () => toast.error('Failed to remove employee'),
  })

  const columns = [
    {
      header: 'Employee', cell: (e: Employee) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-sm flex-shrink-0">
            {e.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900">{e.name}</p>
            <div className="flex items-center gap-3 mt-0.5">
              {e.phone && <span className="flex items-center gap-1 text-xs text-gray-400"><Phone className="w-3 h-3" />{e.phone}</span>}
              {e.email && <span className="flex items-center gap-1 text-xs text-gray-400"><Mail className="w-3 h-3" />{e.email}</span>}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Role', cell: (e: Employee) => e.role
        ? <Badge variant="secondary">{e.role}</Badge>
        : <span className="text-gray-400 text-xs">—</span>
    },
    {
      header: 'Salary', cell: (e: Employee) => (
        <span className="font-medium text-gray-900">{formatCurrency(e.salary)}</span>
      )
    },
    {
      header: 'Commission', cell: (e: Employee) => (
        <span className="flex items-center gap-1 text-gray-600">
          <Percent className="w-3.5 h-3.5" />{e.commission_pct}%
        </span>
      )
    },
    {
      header: 'Hired', cell: (e: Employee) => e.hire_date
        ? <span className="text-gray-500 text-xs">{formatDate(e.hire_date)}</span>
        : <span className="text-gray-400 text-xs">—</span>
    },
    {
      header: 'Status', cell: (e: Employee) => (
        <Badge variant={e.is_active ? 'success' : 'secondary'}>{e.is_active ? 'Active' : 'Inactive'}</Badge>
      )
    },
    {
      header: '', cell: (e: Employee) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => setModal({ open: true, data: e })}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteId(e.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-6">
      <DataTable
        data={data?.results ?? []}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search employees…"
        onSearch={(q) => { setSearch(q); setPage(1) }}
        searchValue={search}
        totalCount={data?.count}
        page={page}
        totalPages={data?.total_pages}
        onPageChange={setPage}
        emptyMessage="No employees yet. Add your first staff member."
        actions={
          <button onClick={() => setModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        }
      />

      {modal.open && (
        <EmployeeModal
          initial={modal.data}
          onClose={() => setModal({ open: false })}
          onSubmit={(d) => {
            const payload = { ...d, salary: String(d.salary), commission_pct: String(d.commission_pct) } as Partial<Employee>
            modal.data
              ? update.mutate({ id: modal.data.id, data: payload })
              : create.mutate(payload)
          }}
          loading={create.isPending || update.isPending}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Remove Employee?"
        description="The employee record will be archived."
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={remove.isPending}
      />
    </div>
  )
}

function EmployeeModal({ initial, onClose, onSubmit, loading }: {
  initial?: Employee; onClose: () => void
  onSubmit: (data: EmployeeForm) => void; loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: initial ? {
      name: initial.name, phone: initial.phone, email: initial.email,
      role: initial.role, salary: parseFloat(initial.salary),
      commission_pct: parseFloat(initial.commission_pct),
      hire_date: initial.hire_date ?? '', is_active: initial.is_active,
    } : { is_active: true, salary: 0, commission_pct: 0 },
  })

  return (
    <Modal title={initial ? 'Edit Employee' : 'Add Employee'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">Full Name *</label>
            <input {...register('name')} placeholder="e.g. John Kamau" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <input {...register('phone')} placeholder="07XXXXXXXX" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input {...register('email')} type="email" placeholder="john@salon.com" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Role / Speciality</label>
            <input {...register('role')} placeholder="e.g. Senior Stylist" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Hire Date</label>
            <input {...register('hire_date')} type="date" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Monthly Salary (KES)</label>
            <input {...register('salary')} type="number" min="0" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Commission %</label>
            <input {...register('commission_pct')} type="number" min="0" max="100" step="0.5" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input {...register('is_active')} type="checkbox" id="emp_active" className="rounded border-gray-300 text-rose-600" />
            <label htmlFor="emp_active" className="text-sm text-gray-700">Active</label>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition disabled:opacity-60">
            {loading ? 'Saving…' : initial ? 'Update' : 'Add Employee'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

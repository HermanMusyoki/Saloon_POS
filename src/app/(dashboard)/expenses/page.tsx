'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Wallet } from 'lucide-react'
import { expensesApi } from '@/lib/api/expenses'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Expense } from '@/types'

const CATEGORIES = [
  'rent', 'utilities', 'supplies', 'salaries', 'marketing', 'equipment', 'maintenance', 'other'
]

const expenseSchema = z.object({
  category: z.string().min(1, 'Category required'),
  description: z.string().min(2, 'Description required'),
  amount: z.coerce.number().min(1, 'Amount required'),
  expense_date: z.string().min(1, 'Date required'),
})
type ExpenseForm = z.infer<typeof expenseSchema>

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function ExpensesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<{ open: boolean; data?: Expense }>({ open: false })
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', page, categoryFilter],
    queryFn: () => expensesApi.getExpenses({
      page: String(page),
      ...(categoryFilter ? { category: categoryFilter } : {}),
    }),
  })

  const create = useMutation({
    mutationFn: (d: ExpenseForm) => expensesApi.createExpense({ ...d, amount: String(d.amount) } as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setModal({ open: false }); toast.success('Expense added') },
    onError: () => toast.error('Failed to add expense'),
  })
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ExpenseForm }) =>
      expensesApi.updateExpense(id, { ...data, amount: String(data.amount) } as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setModal({ open: false }); toast.success('Expense updated') },
    onError: () => toast.error('Failed to update expense'),
  })
  const remove = useMutation({
    mutationFn: expensesApi.deleteExpense,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setDeleteId(null); toast.success('Expense deleted') },
    onError: () => toast.error('Failed to delete expense'),
  })

  // Compute total for current filter
  const total = data?.results?.reduce((sum, e) => sum + parseFloat(e.amount), 0) ?? 0

  const columns = [
    {
      header: 'Description', cell: (e: Expense) => (
        <div>
          <p className="font-medium text-gray-900">{e.description}</p>
          <p className="text-xs text-gray-400">{formatDate(e.expense_date)}</p>
        </div>
      )
    },
    {
      header: 'Category', cell: (e: Expense) => (
        <Badge variant="secondary" className="capitalize">{e.category}</Badge>
      )
    },
    {
      header: 'Amount', cell: (e: Expense) => (
        <span className="font-bold text-gray-900">{formatCurrency(e.amount)}</span>
      )
    },
    {
      header: '', cell: (e: Expense) => (
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
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <p className="text-xs text-gray-400">Showing {data?.count ?? 0} expenses</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
          <p className="text-xs text-gray-400">Total on this page</p>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(['', ...CATEGORIES]).map(c => (
          <button key={c}
            onClick={() => { setCategoryFilter(c); setPage(1) }}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition
              ${categoryFilter === c ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {c || 'All'}
          </button>
        ))}
      </div>

      <DataTable
        data={data?.results ?? []}
        columns={columns}
        isLoading={isLoading}
        totalCount={data?.count}
        page={page}
        totalPages={data?.total_pages}
        onPageChange={setPage}
        emptyMessage="No expenses recorded yet."
        actions={
          <button onClick={() => setModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        }
      />

      {modal.open && (
        <ExpenseModal
          initial={modal.data}
          onClose={() => setModal({ open: false })}
          onSubmit={(d) => modal.data
            ? update.mutate({ id: modal.data.id, data: d })
            : create.mutate(d)}
          loading={create.isPending || update.isPending}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Expense?"
        description="This expense record will be permanently removed."
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={remove.isPending}
      />
    </div>
  )
}

function ExpenseModal({ initial, onClose, onSubmit, loading }: {
  initial?: Expense; onClose: () => void
  onSubmit: (d: ExpenseForm) => void; loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: initial ? {
      category: initial.category,
      description: initial.description,
      amount: parseFloat(initial.amount),
      expense_date: initial.expense_date,
    } : { category: 'other', expense_date: new Date().toISOString().slice(0, 10) },
  })

  return (
    <Modal title={initial ? 'Edit Expense' : 'Add Expense'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Category *</label>
          <select {...register('category')}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20">
            {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Description *</label>
          <textarea {...register('description')} rows={2} placeholder="What was this expense for?"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none" />
          {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Amount (KES) *</label>
            <input {...register('amount')} type="number" min="1" step="0.01"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Date *</label>
            <input {...register('expense_date')} type="date"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
            {errors.expense_date && <p className="text-xs text-red-500 mt-1">{errors.expense_date.message}</p>}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition disabled:opacity-60">
            {loading ? 'Saving…' : initial ? 'Update' : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Plus, Calendar, List, ChevronLeft, ChevronRight,
  Phone, Pencil, Trash2, X
} from 'lucide-react'
import { appointmentsApi, type AppointmentPayload } from '@/lib/api/appointments'
import { customersApi } from '@/lib/api/customers'
import { employeesApi } from '@/lib/api/employees'
import { servicesApi } from '@/lib/api/services'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/format'
import type { Appointment } from '@/types'

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_VARIANT: Record<string, any> = {
  pending: 'warning',
  confirmed: 'default',
  in_progress: 'default',
  completed: 'success',
  cancelled: 'secondary',
  no_show: 'secondary',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

// ── Zod schema ────────────────────────────────────────────────────────────────
const apptSchema = z.object({
  customer: z.coerce.number().min(1, 'Customer is required'),
  employee: z.preprocess(v => (v === '' || v === undefined) ? null : v, z.coerce.number().positive().nullable().optional()),
  service: z.preprocess(v => (v === '' || v === undefined) ? null : v, z.coerce.number().positive().nullable().optional()),
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  status: z.string().default('pending'),
  notes: z.string().optional(),
})
type ApptForm = z.infer<typeof apptSchema>

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Appointment detail modal ──────────────────────────────────────────────────
function ApptDetailModal({ appt, onClose, onEdit, onDelete }: {
  appt: Appointment; onClose: () => void
  onEdit: () => void; onDelete: () => void
}) {
  return (
    <Modal title="Appointment Details" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant={STATUS_VARIANT[appt.status]}>{STATUS_LABEL[appt.status]}</Badge>
          <span className="text-xs text-gray-400">{formatDate(appt.date)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs">Customer</p>
            <p className="font-medium">{appt.customer_name}</p>
            {appt.customer_phone && (
              <p className="text-gray-500 text-xs flex items-center gap-1">
                <Phone className="w-3 h-3" />{appt.customer_phone}
              </p>
            )}
          </div>
          <div>
            <p className="text-gray-400 text-xs">Stylist</p>
            <p className="font-medium">{appt.employee_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Service</p>
            <p className="font-medium">{appt.service_name ?? '—'}</p>
            {appt.service_duration && <p className="text-gray-500 text-xs">{appt.service_duration} min</p>}
          </div>
          <div>
            <p className="text-gray-400 text-xs">Time</p>
            <p className="font-medium">{appt.start_time.slice(0, 5)} – {appt.end_time.slice(0, 5)}</p>
          </div>
        </div>
        {appt.notes && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">{appt.notes}</div>
        )}
        <div className="flex gap-2 pt-2">
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition">
            <Trash2 className="w-3.5 h-3.5" /> Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Calendar day cell ─────────────────────────────────────────────────────────
function CalendarDay({ day, dateStr, appointments, isToday, onSelect }: {
  day: number; dateStr: string; appointments: Appointment[]
  isToday: boolean; onSelect: (a: Appointment) => void
}) {
  return (
    <div className={`min-h-[110px] border-b border-r border-gray-100 p-1.5 ${isToday ? 'bg-rose-50' : ''}`}>
      <span className={`text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full
        ${isToday ? 'bg-rose-600 text-white' : 'text-gray-600'}`}>
        {day}
      </span>
      <div className="space-y-0.5 mt-1">
        {appointments.slice(0, 3).map(a => (
          <button key={a.id} onClick={() => onSelect(a)}
            className="w-full text-left text-xs rounded px-1 py-0.5 truncate font-medium transition hover:opacity-80"
            style={{ backgroundColor: a.category_color ? `${a.category_color}30` : '#f3f4f6', color: a.category_color ?? '#6b7280' }}>
            {a.start_time.slice(0, 5)} {a.customer_name}
          </button>
        ))}
        {appointments.length > 3 && (
          <p className="text-xs text-gray-400 px-1">+{appointments.length - 3} more</p>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const qc = useQueryClient()
  const today = new Date()

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [formModal, setFormModal] = useState<{ open: boolean; data?: Appointment }>({ open: false })
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // Date range for calendar month
  const dateFrom = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`
  const lastDay = new Date(calYear, calMonth + 1, 0).getDate()
  const dateTo = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data: calData } = useQuery({
    queryKey: ['appointments', 'calendar', calYear, calMonth],
    queryFn: () => appointmentsApi.getAppointments({ date_from: dateFrom, date_to: dateTo, page_size: '300' }),
    enabled: viewMode === 'calendar',
  })
  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['appointments', 'list', page, search, statusFilter],
    queryFn: () => appointmentsApi.getAppointments({
      search, page: String(page), ...(statusFilter ? { status: statusFilter } : {})
    }),
    enabled: viewMode === 'list',
  })
  const { data: custData } = useQuery({ queryKey: ['customers-all'], queryFn: () => customersApi.getCustomers({ page_size: '300' }) })
  const { data: empData } = useQuery({ queryKey: ['employees-all'], queryFn: () => employeesApi.getEmployees({ page_size: '300' }) })
  const { data: svcData } = useQuery({ queryKey: ['services-all'], queryFn: () => servicesApi.getServices({ page_size: '300' }) })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['appointments'] })

  const create = useMutation({
    mutationFn: appointmentsApi.createAppointment,
    onSuccess: () => { invalidate(); setFormModal({ open: false }); toast.success('Appointment booked') },
    onError: (e: any) => toast.error(e?.response?.data?.non_field_errors?.[0] ?? 'Failed to book appointment'),
  })
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AppointmentPayload> }) =>
      appointmentsApi.updateAppointment(id, data),
    onSuccess: () => { invalidate(); setFormModal({ open: false }); setDetailAppt(null); toast.success('Appointment updated') },
    onError: (e: any) => toast.error(e?.response?.data?.non_field_errors?.[0] ?? 'Failed to update'),
  })
  const remove = useMutation({
    mutationFn: appointmentsApi.deleteAppointment,
    onSuccess: () => { invalidate(); setDeleteId(null); setDetailAppt(null); toast.success('Appointment removed') },
    onError: () => toast.error('Failed to cancel appointment'),
  })

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const calAppts = calData?.results ?? []
  const apptsByDate = calAppts.reduce<Record<string, Appointment[]>>((acc, a) => {
    (acc[a.date] ??= []).push(a)
    return acc
  }, {})

  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate()
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  // ── List columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      header: 'Customer', cell: (a: Appointment) => (
        <div>
          <p className="font-medium text-gray-900">{a.customer_name}</p>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Phone className="w-3 h-3" />{a.customer_phone}
          </span>
        </div>
      )
    },
    {
      header: 'Service', cell: (a: Appointment) => (
        <div>
          <p className="text-sm text-gray-800">{a.service_name ?? '—'}</p>
          {a.service_duration && <p className="text-xs text-gray-400">{a.service_duration} min</p>}
        </div>
      )
    },
    {
      header: 'Stylist', cell: (a: Appointment) => (
        <span className="text-sm text-gray-600">{a.employee_name ?? '—'}</span>
      )
    },
    {
      header: 'Date & Time', cell: (a: Appointment) => (
        <div>
          <p className="text-sm text-gray-800">{formatDate(a.date)}</p>
          <p className="text-xs text-gray-400">{a.start_time.slice(0, 5)} – {a.end_time.slice(0, 5)}</p>
        </div>
      )
    },
    {
      header: 'Status', cell: (a: Appointment) => (
        <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
      )
    },
    {
      header: '', cell: (a: Appointment) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => setFormModal({ open: true, data: a })}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteId(a.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          {(['calendar', 'list'] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition
                ${viewMode === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {v === 'calendar' ? <Calendar className="w-4 h-4" /> : <List className="w-4 h-4" />}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => setFormModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition">
          <Plus className="w-4 h-4" /> Book Appointment
        </button>
      </div>

      {/* Calendar view */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-semibold text-gray-900">{MONTHS[calMonth]} {calYear}</h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {/* Prev month trailing */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`prev-${i}`} className="min-h-[110px] border-b border-r border-gray-100 p-1.5 bg-gray-50/50">
                <span className="text-xs text-gray-300">{prevMonthDays - firstDayOfMonth + 1 + i}</span>
              </div>
            ))}
            {/* Current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day
              return (
                <CalendarDay key={day} day={day} dateStr={ds}
                  appointments={apptsByDate[ds] ?? []}
                  isToday={isToday}
                  onSelect={setDetailAppt}
                />
              )
            })}
            {/* Next month leading */}
            {Array.from({ length: (7 - (firstDayOfMonth + daysInMonth) % 7) % 7 }).map((_, i) => (
              <div key={`next-${i}`} className="min-h-[110px] border-b border-r border-gray-100 p-1.5 bg-gray-50/50">
                <span className="text-xs text-gray-300">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {(['', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] as const).map(s => (
              <button key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition
                  ${statusFilter === s ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s ? STATUS_LABEL[s] : 'All'}
              </button>
            ))}
          </div>
          <DataTable
            data={listData?.results ?? []}
            columns={columns}
            isLoading={listLoading}
            searchPlaceholder="Search by customer, service, stylist…"
            onSearch={(q) => { setSearch(q); setPage(1) }}
            searchValue={search}
            totalCount={listData?.count}
            page={page}
            totalPages={listData?.total_pages}
            onPageChange={setPage}
            emptyMessage="No appointments found."
          />
        </div>
      )}

      {/* Booking form modal */}
      {formModal.open && (
        <AppointmentModal
          initial={formModal.data}
          customers={custData?.results ?? []}
          employees={empData?.results ?? []}
          services={svcData?.results ?? []}
          onClose={() => setFormModal({ open: false })}
          onSubmit={(d) => {
            const payload: AppointmentPayload = {
              customer: d.customer,
              employee: d.employee || null,
              service: d.service || null,
              date: d.date,
              start_time: d.start_time,
              end_time: d.end_time,
              status: d.status,
              notes: d.notes,
            }
            formModal.data
              ? update.mutate({ id: formModal.data.id, data: payload })
              : create.mutate(payload)
          }}
          loading={create.isPending || update.isPending}
        />
      )}

      {/* Detail modal */}
      {detailAppt && (
        <ApptDetailModal
          appt={detailAppt}
          onClose={() => setDetailAppt(null)}
          onEdit={() => { setFormModal({ open: true, data: detailAppt }); setDetailAppt(null) }}
          onDelete={() => { setDeleteId(detailAppt.id); setDetailAppt(null) }}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Cancel Appointment?"
        description="The appointment will be removed."
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={remove.isPending}
      />
    </div>
  )
}

// ── Booking / Edit form ───────────────────────────────────────────────────────
function AppointmentModal({ initial, customers, employees, services, onClose, onSubmit, loading }: {
  initial?: Appointment
  customers: any[]; employees: any[]; services: any[]
  onClose: () => void
  onSubmit: (data: ApptForm) => void
  loading: boolean
}) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ApptForm>({
    resolver: zodResolver(apptSchema),
    defaultValues: initial ? {
      customer: initial.customer,
      employee: initial.employee ?? undefined,
      service: initial.service ?? undefined,
      date: initial.date,
      start_time: initial.start_time.slice(0, 5),
      end_time: initial.end_time.slice(0, 5),
      status: initial.status,
      notes: initial.notes,
    } : { status: 'pending' },
  })

  const startTime = watch('start_time')

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sid = Number(e.target.value)
    setValue('service', sid || undefined)
    const svc = services.find(s => s.id === sid)
    if (svc && startTime) {
      const [h, m] = startTime.split(':').map(Number)
      const endMin = h * 60 + m + svc.duration_minutes
      setValue('end_time', `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`)
    }
  }

  return (
    <Modal title={initial ? 'Edit Appointment' : 'Book Appointment'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">Customer *</label>
            <select {...register('customer')} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20">
              <option value="">Select customer…</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>)}
            </select>
            {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Stylist</label>
            <select {...register('employee')} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20">
              <option value="">Any stylist</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Service</label>
            <select
              {...register('service')}
              onChange={handleServiceChange}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20">
              <option value="">Select service…</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}min)</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Date *</label>
            <input {...register('date')} type="date"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Start Time *</label>
            <input {...register('start_time')} type="time"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
            {errors.start_time && <p className="text-xs text-red-500 mt-1">{errors.start_time.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">End Time *</label>
            <input {...register('end_time')} type="time"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
            {errors.end_time && <p className="text-xs text-red-500 mt-1">{errors.end_time.message}</p>}
          </div>

          {initial && (
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select {...register('status')} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20">
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          )}

          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Any special requests…"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition disabled:opacity-60">
            {loading ? 'Saving…' : initial ? 'Update' : 'Book'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

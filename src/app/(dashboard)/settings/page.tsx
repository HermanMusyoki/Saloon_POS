'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Plus, Pencil, UserX, X, ShieldCheck,
  User, Mail, Phone, KeyRound
} from 'lucide-react'
import { authApi } from '@/lib/api/auth'
import { useAuth } from '@/providers/AuthProvider'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import type { User as UserType } from '@/types'

// ── Shared password rules ─────────────────────────────────────────────────────
const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[0-9]/, 'Must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Must contain a special character (e.g. @, #, !)')

// ── Schemas ───────────────────────────────────────────────────────────────────
const createSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional().default(''),
  role: z.enum(['admin', 'receptionist', 'cashier', 'stylist']),
  password: passwordSchema,
})
type CreateForm = z.infer<typeof createSchema>

const editSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional().default(''),
  role: z.enum(['admin', 'receptionist', 'cashier', 'stylist']),
})
type EditForm = z.infer<typeof editSchema>

const pwSchema = z.object({
  old_password: z.string().min(1, 'Required'),
  new_password: passwordSchema,
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
type PwForm = z.infer<typeof pwSchema>

// ── Role badge colours ────────────────────────────────────────────────────────
const ROLE_VARIANT: Record<string, any> = {
  admin: 'destructive',
  receptionist: 'default',
  cashier: 'warning',
  stylist: 'success',
}
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  receptionist: 'Receptionist',
  cashier: 'Cashier',
  stylist: 'Stylist',
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
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

// ── Field component ───────────────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400'

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const qc = useQueryClient()
  const { user: me } = useAuth()

  const [tab, setTab] = useState<'users' | 'password'>('users')
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState<{ open: boolean; data?: UserType }>({ open: false })
  const [deactivateId, setDeactivateId] = useState<number | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: authApi.getUsers,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] })

  const createMutation = useMutation({
    mutationFn: authApi.createUser,
    onSuccess: () => { invalidate(); setCreateModal(false); toast.success('User created') },
    onError: (e: any) => {
      const detail = e?.response?.data
      const msg = detail?.email?.[0] ?? detail?.password?.[0] ?? 'Failed to create user'
      toast.error(msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EditForm }) => authApi.updateUser(id, data),
    onSuccess: () => { invalidate(); setEditModal({ open: false }); toast.success('User updated') },
    onError: () => toast.error('Failed to update user'),
  })

  const deactivateMutation = useMutation({
    mutationFn: authApi.deactivateUser,
    onSuccess: () => { invalidate(); setDeactivateId(null); toast.success('User deactivated') },
    onError: () => toast.error('Failed to deactivate user'),
  })

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage system users and your account</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['users', 'password'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px
              ${tab === t ? 'border-rose-600 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'users' ? 'System Users' : 'Change Password'}
          </button>
        ))}
      </div>

      {/* ── Users tab ── */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{users.length} user{users.length !== 1 ? 's' : ''} in the system</p>
            <button onClick={() => setCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No users found.</div>
            ) : users.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-rose-600">
                    {u.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{u.full_name}</p>
                    {u.id === me?.id && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">You</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Mail className="w-3 h-3" />{u.email}
                    </span>
                    {u.phone && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Phone className="w-3 h-3" />{u.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Role */}
                <Badge variant={ROLE_VARIANT[u.role]}>
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {ROLE_LABELS[u.role]}
                </Badge>

                {/* Actions — can't edit/deactivate yourself */}
                {u.id !== me?.id && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setEditModal({ open: true, data: u })}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
                      title="Edit user">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeactivateId(u.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition"
                      title="Deactivate user">
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Change password tab ── */}
      {tab === 'password' && <ChangePasswordForm />}

      {/* Modals */}
      {createModal && (
        <CreateUserModal
          onClose={() => setCreateModal(false)}
          onSubmit={d => createMutation.mutate(d)}
          loading={createMutation.isPending}
        />
      )}

      {editModal.open && editModal.data && (
        <EditUserModal
          user={editModal.data}
          onClose={() => setEditModal({ open: false })}
          onSubmit={d => updateMutation.mutate({ id: editModal.data!.id, data: d })}
          loading={updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={deactivateId !== null}
        title="Deactivate User?"
        description="The user will be unable to log in. This can be undone by an admin."
        onConfirm={() => deactivateId && deactivateMutation.mutate(deactivateId)}
        onCancel={() => setDeactivateId(null)}
        loading={deactivateMutation.isPending}
      />
    </div>
  )
}

// ── Create user modal ─────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onSubmit, loading }: {
  onClose: () => void
  onSubmit: (d: CreateForm) => void
  loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'receptionist', phone: '' },
  })

  return (
    <Modal title="Add System User" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Full Name *" error={errors.full_name?.message}>
          <input {...register('full_name')} placeholder="e.g. Jane Doe" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email *" error={errors.email?.message}>
            <input {...register('email')} type="email" placeholder="jane@salon.com" className={inputCls} />
          </Field>
          <Field label="Phone">
            <input {...register('phone')} placeholder="07XXXXXXXX" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Role *" error={errors.role?.message}>
            <select {...register('role')} className={inputCls}>
              <option value="admin">Admin</option>
              <option value="receptionist">Receptionist</option>
              <option value="cashier">Cashier</option>
              <option value="stylist">Stylist</option>
            </select>
          </Field>
          <Field label="Password *" error={errors.password?.message}>
            <input {...register('password')} type="password" placeholder="Min 8 characters" className={inputCls} />
            {!errors.password && (
              <p className="text-xs text-gray-400 mt-1">Min 8 chars · uppercase · number · special character</p>
            )}
          </Field>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition disabled:opacity-60">
            {loading ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Edit user modal ───────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSubmit, loading }: {
  user: UserType
  onClose: () => void
  onSubmit: (d: EditForm) => void
  loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { full_name: user.full_name, email: user.email, phone: user.phone, role: user.role },
  })

  return (
    <Modal title="Edit User" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Full Name *" error={errors.full_name?.message}>
          <input {...register('full_name')} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email *" error={errors.email?.message}>
            <input {...register('email')} type="email" className={inputCls} />
          </Field>
          <Field label="Phone">
            <input {...register('phone')} className={inputCls} />
          </Field>
        </div>
        <Field label="Role *" error={errors.role?.message}>
          <select {...register('role')} className={inputCls}>
            <option value="admin">Admin</option>
            <option value="receptionist">Receptionist</option>
            <option value="cashier">Cashier</option>
            <option value="stylist">Stylist</option>
          </select>
        </Field>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition disabled:opacity-60">
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Change password form ──────────────────────────────────────────────────────
function ChangePasswordForm() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
  })

  const mutation = useMutation({
    mutationFn: (d: PwForm) => authApi.changePassword(d.old_password, d.new_password),
    onSuccess: () => { reset(); toast.success('Password changed successfully') },
    onError: (e: any) => toast.error(e?.response?.data?.old_password?.[0] ?? 'Failed to change password'),
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-md">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-rose-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Change Your Password</h3>
          <p className="text-xs text-gray-500">Update the password for your account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <Field label="Current Password" error={errors.old_password?.message}>
          <input {...register('old_password')} type="password" className={inputCls} />
        </Field>
        <Field label="New Password" error={errors.new_password?.message}>
          <input {...register('new_password')} type="password" placeholder="Min 8 characters" className={inputCls} />
          {!errors.new_password && (
            <p className="text-xs text-gray-400 mt-1">Min 8 chars · uppercase · number · special character</p>
          )}
        </Field>
        <Field label="Confirm New Password" error={errors.confirm_password?.message}>
          <input {...register('confirm_password')} type="password" className={inputCls} />
        </Field>
        <button type="submit" disabled={mutation.isPending}
          className="w-full py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition disabled:opacity-60">
          {mutation.isPending ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}

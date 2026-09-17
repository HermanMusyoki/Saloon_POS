import { apiClient } from './client'
import type { Appointment, PaginatedResponse } from '@/types'

export interface AppointmentPayload {
  customer: number
  employee?: number | null
  service?: number | null
  date: string
  start_time: string
  end_time: string
  status?: string
  notes?: string
}

export interface AvailabilitySlot {
  start: string
  end: string
}

export const appointmentsApi = {
  getAppointments: (params?: Record<string, string>) =>
    apiClient.get<PaginatedResponse<Appointment>>('/appointments/', { params }).then(r => r.data),

  getAppointment: (id: number) =>
    apiClient.get<Appointment>(`/appointments/${id}/`).then(r => r.data),

  createAppointment: (data: AppointmentPayload) =>
    apiClient.post<Appointment>('/appointments/', data).then(r => r.data),

  updateAppointment: (id: number, data: Partial<AppointmentPayload>) =>
    apiClient.patch<Appointment>(`/appointments/${id}/`, data).then(r => r.data),

  deleteAppointment: (id: number) =>
    apiClient.delete(`/appointments/${id}/`).then(r => r.data),

  getAvailability: (params: { employee_id: number; date: string; service_id?: number }) =>
    apiClient.get<{ date: string; employee_id: string; slots: AvailabilitySlot[] }>(
      '/appointments/availability/', { params }
    ).then(r => r.data),
}

import { apiClient } from './client'

export interface DashboardSummary {
  today_revenue: number
  monthly_revenue: number
  today_appointments: number
  pending_appointments: number
  total_customers: number
  monthly_expenses: number
  net_profit: number
}

export interface RevenuePoint { date: string; revenue: number; count: number }
export interface AppointmentStatusPoint { status: string; count: number }
export interface TopService { service: string; revenue: number; count: number }
export interface StaffPerformance { name: string; revenue: number; sales_count: number; appt_count: number }
export interface ExpenseSummary { category: string; total: number; count: number }

const params = (from?: string, to?: string) =>
  from || to ? { ...(from ? { date_from: from } : {}), ...(to ? { date_to: to } : {}) } : undefined

export const reportsApi = {
  getDashboardSummary: () =>
    apiClient.get<DashboardSummary>('/reports/dashboard/').then(r => r.data),

  getRevenueChart: (from?: string, to?: string) =>
    apiClient.get<RevenuePoint[]>('/reports/revenue/', { params: params(from, to) }).then(r => r.data),

  getAppointmentsChart: (from?: string, to?: string) =>
    apiClient.get<AppointmentStatusPoint[]>('/reports/appointments/', { params: params(from, to) }).then(r => r.data),

  getTopServices: (from?: string, to?: string) =>
    apiClient.get<TopService[]>('/reports/top-services/', { params: params(from, to) }).then(r => r.data),

  getStaffPerformance: (from?: string, to?: string) =>
    apiClient.get<StaffPerformance[]>('/reports/staff-performance/', { params: params(from, to) }).then(r => r.data),

  getExpensesSummary: (from?: string, to?: string) =>
    apiClient.get<ExpenseSummary[]>('/reports/expenses/', { params: params(from, to) }).then(r => r.data),
}

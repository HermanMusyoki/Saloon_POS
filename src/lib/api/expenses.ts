import { apiClient } from './client'
import type { Expense, PaginatedResponse } from '@/types'

export const expensesApi = {
  getExpenses: (params?: Record<string, string>) =>
    apiClient.get<PaginatedResponse<Expense>>('/expenses/', { params }).then(r => r.data),

  createExpense: (data: Partial<Expense>) =>
    apiClient.post<Expense>('/expenses/', data).then(r => r.data),

  updateExpense: (id: number, data: Partial<Expense>) =>
    apiClient.patch<Expense>(`/expenses/${id}/`, data).then(r => r.data),

  deleteExpense: (id: number) =>
    apiClient.delete(`/expenses/${id}/`).then(r => r.data),
}

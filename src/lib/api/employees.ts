import { apiClient } from './client'
import type { Employee, PaginatedResponse } from '@/types'

export const employeesApi = {
  getEmployees: async (params?: Record<string, string>): Promise<PaginatedResponse<Employee>> => {
    const { data } = await apiClient.get('/employees/', { params })
    return data
  },
  getEmployee: async (id: number): Promise<Employee> => {
    const { data } = await apiClient.get(`/employees/${id}/`)
    return data
  },
  createEmployee: async (payload: Partial<Employee>): Promise<Employee> => {
    const { data } = await apiClient.post('/employees/', payload)
    return data
  },
  updateEmployee: async (id: number, payload: Partial<Employee>): Promise<Employee> => {
    const { data } = await apiClient.patch(`/employees/${id}/`, payload)
    return data
  },
  deleteEmployee: async (id: number): Promise<void> => {
    await apiClient.delete(`/employees/${id}/`)
  },
}

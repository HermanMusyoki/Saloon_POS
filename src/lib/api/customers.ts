import { apiClient } from './client'
import type { Customer, PaginatedResponse } from '@/types'

export const customersApi = {
  getCustomers: async (params?: Record<string, string>): Promise<PaginatedResponse<Customer>> => {
    const { data } = await apiClient.get('/customers/', { params })
    return data
  },
  getCustomer: async (id: number): Promise<Customer> => {
    const { data } = await apiClient.get(`/customers/${id}/`)
    return data
  },
  createCustomer: async (payload: Partial<Customer>): Promise<Customer> => {
    const { data } = await apiClient.post('/customers/', payload)
    return data
  },
  updateCustomer: async (id: number, payload: Partial<Customer>): Promise<Customer> => {
    const { data } = await apiClient.patch(`/customers/${id}/`, payload)
    return data
  },
  deleteCustomer: async (id: number): Promise<void> => {
    await apiClient.delete(`/customers/${id}/`)
  },
}
